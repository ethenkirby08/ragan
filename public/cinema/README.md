# The cinematic sequence (Mode B)

This folder is empty on purpose. Drop a rendered sequence in and the
homepage hero switches from the realtime Three.js scene to scrubbing your
frames — no other change to the site.

```
scroll  →  damped timeline  →  frame index  →  canvas
```

That is the same chain the realtime scene uses; only the last step
differs. The chapters, the beats, the typography, the damping and the
scroll behaviour are all upstream of this and do not know or care which
renderer is running.

## Why this exists

Real-time WebGL has a ceiling and it is well short of "someone filmed
this". Path-traced grass, true depth of field, light scattering through a
leaf, real motion blur — those are offline-render features. If the hero
has to look photographic, it has to be rendered offline and scrubbed.
That is this folder.

## What to produce

| | |
|---|---|
| Length | 6–10 seconds of action |
| Frames | **120–240** (fewer is steppy, more is bandwidth for no gain) |
| Size | **1600 × 2000** portrait, or 1920 × 1080 landscape |
| Format | **WebP**, quality ~78 (AVIF also fine) |
| Budget | aim under ~12 MB for the whole sequence |

Portrait is the better choice: the site is reviewed on a phone, and the
canvas covers rather than letterboxes, so a landscape sequence loses its
sides on mobile.

The shot should follow the existing beats so the chapters still land:
tee → club enters → impact → launch → climb → apex → descent → landing →
roll → the cup. The timeline maps linearly onto the frames, so pacing is
set by where you put the action in the render, not by code.

## Rendering it in Blender

```
Output    ▸ File Format   WebP (or PNG, then convert)
          ▸ Color         RGB
          ▸ Frame Range   1 – 180
          ▸ File Path     //frames/raige_
Render    ▸ Engine        Cycles
          ▸ Samples       256–512 with denoising
          ▸ Motion Blur   ON  — this is most of the "filmed" feeling
Film      ▸ Transparent   OFF
Color Mgmt▸ View          AgX (or Filmic), Look: Medium High Contrast
```

Worth the render time, in rough order of payoff: real motion blur, a
sunrise HDRI for the lighting, an actual particle-system grass field,
depth of field on the ball, and a hint of grain.

If you would rather generate the sequence with video AI, that works too:
produce the clip, then cut it to frames with

```bash
ffmpeg -i hero.mp4 -vf "fps=24,scale=1600:-2" -quality 78 frames/raige_%04d.webp
```

## Installing it

1. Put the frames in `public/cinema/frames/`, named `raige_0000.webp`
   upward (zero-padded, starting at 0).
2. Generate the manifest:

   ```bash
   node scripts/build-cinema-manifest.mjs
   ```

3. Turn the mode on in `.env`:

   ```
   VITE_CINEMA_MODE=frames
   ```

4. `npm run dev` and scroll.

`VITE_CINEMA_MODE` takes `realtime` (the default), `frames`, or `auto`.
`auto` uses the sequence when it is present and the realtime scene when it
is not, which is the setting to use once both work.

## The manifest

`manifest.json`, written by the script above:

```json
{
  "version": 1,
  "frameCount": 180,
  "width": 1600,
  "height": 2000,
  "pattern": "/cinema/frames/raige_%04d.webp"
}
```

## How loading behaves

A sequence is tens of megabytes, so it loads in two passes. The first
grabs every 8th frame — enough to scrub the entire film within a second
or two, slightly steppy — and the rest fills in behind it. Until a given
frame arrives the nearest decoded one is drawn, so scrubbing never
stalls and never shows a blank.

If the manifest is missing, malformed, or the frames fail to load, the
site falls back to the realtime scene and says so in the console. The
hero always plays.
