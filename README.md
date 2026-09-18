# RAIGE

**Southern and Golf Apparel — Est. 2026**

A cinematic storefront. The homepage is a single scroll-driven film that
follows one golf ball from the first tee, through the strike, up into
flight, into the collection, down onto the green and into the cup — and
the store opens where the film ends.

---

## Running it

```bash
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`).

| Command | What it does |
|---|---|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Lint the source |

Requires Node 20 or newer.

---

## How the film works

There is one idea holding the whole homepage together, and it is worth
understanding before changing anything:

**Everything is a pure function of a single number.**

A tall invisible track (`.film-track`) is measured by one GSAP
ScrollTrigger. It does not set the film's position — it sets a *target*.
The timeline in `src/lib/scrollStore.ts` then travels toward that target
under two constraints: exponential damping, and a hard ceiling on how
fast it may advance per second.

The ceiling is the important part. Without it, one fast swipe on a phone
moves the scroll position through most of the film in a few frames, the
ball leaps across the sky, and the viewer loses any sense of where they
are. With it, the page still scrolls at full speed — flick to the footer
and you are there instantly — but the film plays through at a readable
rate and settles exactly where the scroll left it.

From that one damped number the site derives the ball's position and
spin, the camera's position and lens, the colour of the sky, the density
of the haze, and the opacity of all nine chapters of typography.

Three things follow, and all three matter:

- **Scrolling back up replays the film exactly in reverse.** Nothing
  integrates velocity or accumulates state, so the scene cannot drift,
  stick, or desynchronise, however fast or erratically someone scrolls.
- **The camera cannot lose the ball.** Both read the same damped value,
  and the lens is rigged as an offset from the ball rather than an
  absolute position.
- **Scrolling costs no React renders.** The 3D scene reads the value
  inside its animation frame; the HTML chapters subscribe and write style
  directly to their own DOM nodes. React is not involved in a single
  frame of the film.

The timeline is integrated in fixed sub-steps rather than one jump per
frame, so the speed limit stays honest in *seconds* on a phone rendering
at 12fps as much as on a desktop at 120. Phones also get stronger damping
and a lower ceiling than desktops — see `TUNING` in `scrollStore.ts`.

Retiming the film means editing the numbers in `BEATS` (in
`scrollStore.ts`) and the keyframe tables in `src/scene/cinematics.ts`.
Nothing else needs to change.

### The camera

The camera is rigged as an **offset from the ball**, never as an absolute
position. The ball is the main character, so the lens is literally
attached to it and cannot lose its subject at any scroll position on any
screen size. Its focal length changes through the film too — long and
intimate on the tee, wide at the apex, back to a portrait lens for the
apparel chapters.

### The environment

Every part of the course is generated in code: the sky, the fairway
shader with its grass sheen and mow stripes, tens of thousands of
instanced grass blades at the tee, a tree line of foliage-mapped cards,
the putting green, and the ball's dimple normal map and RAIGE stamp.
There is no photography in the 3D scene at all.

### Two renderers

The hero film has two interchangeable back ends, both driven by the same
timeline:

| | |
|---|---|
| **Mode A — realtime** | the Three.js scene in `src/scene` (default) |
| **Mode B — frames** | a pre-rendered image sequence, scrubbed |

Real-time WebGL has a ceiling well short of "someone filmed this".
Path-traced grass, true depth of field and real motion blur are offline
features. Mode B is the route to a photographic hero: render it in
Blender or shoot it, drop the frames in `public/cinema/frames/`, and
scroll scrubs them instead. The chapters, beats and scroll behaviour sit
upstream of the renderer and do not change.

See **`public/cinema/README.md`** for the render settings, the manifest
format and how to switch modes.

---

## Project structure

```
src/
  lib/          scrollStore (the timeline), motion maths, smooth scroll, hooks
  scene/        the 3D film
    cinematics.ts    ball trajectory, camera rig, atmosphere — all pure functions
    Scene.tsx        assembles the scene and drives the camera
    Environment.tsx  sky, turf, tree line, green, cup, flagstick
    Grass.tsx        instanced blades at the tee
    GolfBall.tsx     ball, tee, club silhouette, turf spray, motion blur
    textures.ts      procedurally generated maps
    cinema/          Mode A / Mode B selection and the frame-sequence player
    FallbackScene.tsx  the CSS course, for when 3D is unavailable
  sections/     the nine chapters, the shop preview, the editorial bands
  components/   navigation, loader, product card, brand marks, garments, footer
  pages/        Home (the film) and Shop (the store)
  data/         the product model and mock catalogue
  styles/       design tokens and global base
  assets/       where real photography goes — see assets/README.md
scripts/
  derive-brand-assets.py      logo PNGs, derived from the supplied artwork
  build-cinema-manifest.mjs   manifest for a pre-rendered sequence
public/cinema/                drop a rendered sequence here (see its README)
```

---

## What works today

- The full nine-chapter cinematic homepage, scrubbed and reversible
- A procedural 3D golf course with a dimpled, branded golf ball
- Nine chapters of typography choreographed onto the same timeline
- The `/shop` store: category filtering, product grid, and quick view
- About, Journal and Clubhouse sections, so every nav item leads somewhere
- Full keyboard navigation, semantic landmarks and a skip link
- A reduced-motion edit: the same story, told as a calm document
- Graceful fallback to a CSS course if WebGL is missing or the scene fails
- Mobile: the same story, a lighter scene, a shorter runway

## What is deliberately placeholder

- **Garment illustrations.** Drawn in SVG until the campaign is shot. The
  swap is a one-line change per product — see `src/assets/README.md`.
- **Nothing about the logo.** The marks render the supplied artwork
  itself. `scripts/derive-brand-assets.py` recovers the ink's coverage
  from `raige-logo-original.jpg` and keeps it as an alpha channel, so the
  letterforms, proportions, wording and flag/R monogram are the
  original's own pixels. Two inks exist for legibility only.
- **Products.** Six mock pieces in `src/data/products.ts`, shaped exactly
  as a commerce backend returns them.
- **Journal entries.** Written as placeholder editorial.

## What is not built yet, by design

No cart, checkout, payments, accounts, inventory, or CMS. The product
model and the `loadProducts()` seam in `src/data/products.ts` are shaped
so that Shopify, Stripe or a database can be connected by replacing that
one function — no component that renders a product needs to change.

Sound is architected for but disabled: nothing plays automatically, and
nothing ever should without the visitor asking for it.

---

## Performance notes

- Three.js is lazy-loaded, so `/shop` never downloads it
- Grass blade counts scale with device class; phones build a fraction
- The render loop stops entirely once the film scrolls off screen
- Device pixel ratio is capped at 2 (1.6 on phones)
- Fonts are self-hosted — no CDN request, no layout shift
- The tree line is two draw calls; the ball's shadow is a textured plane
  rather than a shadow map

## Browser support

Modern evergreen browsers. Without WebGL the site renders the CSS course
and stays fully navigable.
