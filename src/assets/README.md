# RAIGE — Assets

Everything the site renders today is generated in code: the 3D course, the
golf ball's dimples and brand stamp, the garment illustrations and the logo
lockup. There is no photography anywhere in the build, which is why it loads
in kilobytes and why nothing on screen looks like a stock library.

That is a starting point, not the destination. This is where the real
campaign goes when it exists.

## Directory

| Folder | What belongs here |
|---|---|
| `brand/` | The official logo files. `raige-logo-original.jpg` is the supplied artwork and the source of truth for proportion. |
| `golf/` | Course and environment photography — the tee, the fairway, the green. |
| `products/` | Product photography, one folder per product slug. |
| `environments/` | Backplates, HDRIs, and any imagery used behind the 3D scene. |

## Swapping in real photography

**Products.** Add image paths to the `images` array in
`src/data/products.ts`. Every component that renders a product already
prefers `images[0]` and only falls back to the drawn garment when the array
is empty, so a single edit switches the whole site — cards, quick view, and
the cinematic product chapter — with no component changes.

```ts
images: [
  '/src/assets/products/southern-polo/forest-01.webp',
  '/src/assets/products/southern-polo/forest-02.webp',
],
```

The second image is used for the card's hover state.

**The logo.** `src/components/BrandMark.tsx` holds vector reconstructions of
the lockup, built so they stay crisp at any size and recolour with
`currentColor`. Replace them with the official vector artwork when it is
available; the component API (`RaigeMonogram`, `RaigeWordmark`,
`RaigeLockup`) should stay the same.

**Course imagery.** The 3D scene is procedural and does not need
photography. If a photographic backplate is wanted later, it belongs in
`environments/` and would be applied in `src/scene/Environment.tsx`.

## Naming and format

- Lower-case, hyphenated: `southern-polo-forest-01.webp`
- Prefer `.webp` or `.avif`; keep the longest edge at or under 2000px
- Product shots on a consistent background, one light source, shot as one
  campaign — the whole design depends on the imagery reading as a set

## Art direction

35mm, shallow depth of field, warm natural light, early morning or golden
hour, subtle grain, restrained saturation. No posed golfers looking at
camera, no oversaturated grass, no obviously synthetic hands or faces.
