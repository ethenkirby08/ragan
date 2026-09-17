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
ScrollTrigger, which writes a progress value between 0 and 1 into
`src/lib/scrollStore.ts`. Nothing else listens to scroll. From that one
number the site derives the ball's position, the camera's position and
lens, the colour of the sky, the density of the haze, and the opacity of
all nine chapters of typography.

Two things follow from that, and both matter:

- **Scrolling back up replays the film exactly in reverse.** Nothing
  integrates velocity or accumulates state, so the scene cannot drift,
  stick, or desynchronise, however fast or erratically someone scrolls.
- **Scrolling costs no React renders.** The 3D scene reads the value
  inside its animation frame; the HTML chapters subscribe and write style
  directly to their own DOM nodes. React is not involved in a single
  frame of the film.

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

Every part of the course is generated in code: the sky gradient, the
mown fairway shader, the instanced tree line, the putting green, the
ball's dimple normal map and its RAIGE stamp. There is no photography in
the 3D scene at all. It loads in kilobytes, it is always on-brand, and it
can never look like stock imagery.

---

## Project structure

```
src/
  lib/          scrollStore (the timeline), motion maths, smooth scroll, hooks
  scene/        the 3D film
    cinematics.ts    ball trajectory, camera rig, atmosphere — all pure functions
    Scene.tsx        assembles the scene and drives the camera
    Environment.tsx  sky, turf, tree line, green, cup, flagstick
    GolfBall.tsx     ball, tee, club silhouette, turf spray
    textures.ts      procedurally generated maps
    FallbackScene.tsx  the CSS course, for when 3D is unavailable
  sections/     the nine chapters, the shop preview, the editorial bands
  components/   navigation, loader, product card, brand marks, garments, footer
  pages/        Home (the film) and Shop (the store)
  data/         the product model and mock catalogue
  styles/       design tokens and global base
  assets/       where real photography goes — see assets/README.md
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
- **The logo.** Rendered from vector reconstructions in
  `BrandMark.tsx`. The supplied artwork is kept at
  `src/assets/brand/raige-logo-original.jpg` as the source of truth.
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
- The render loop stops entirely once the film scrolls off screen
- Device pixel ratio is capped at 2 (1.6 on phones)
- Fonts are self-hosted — no CDN request, no layout shift
- The tree line is two draw calls; the ball's shadow is a textured plane
  rather than a shadow map

## Browser support

Modern evergreen browsers. Without WebGL the site renders the CSS course
and stays fully navigable.
