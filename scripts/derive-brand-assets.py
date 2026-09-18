#!/usr/bin/env python3
"""
RAIGE — brand asset derivation.

Produces the web-ready logo files from the ONE piece of supplied artwork:

    src/assets/brand/raige-logo-original.jpg

Nothing here redraws, re-letters or re-proportions the logo. The artwork is
ink printed on cream paper, so each pixel is:

    observed = paper * (1 - a) + ink * a

Solving that for `a` recovers the ink's coverage, antialiasing and all. We
keep that alpha exactly as measured and only choose which ink it carries:
the original forest for light grounds, cream for dark ones. Shapes,
spacing, typography and the flag/R monogram are untouched by construction —
they are the alpha channel, and the alpha channel is measured, not drawn.

Run:  python3 scripts/derive-brand-assets.py
"""

from PIL import Image
import numpy as np
import pathlib

SRC = pathlib.Path('src/assets/brand/raige-logo-original.jpg')
OUT = pathlib.Path('src/assets/brand')
PUBLIC = pathlib.Path('public')

# Measured from the supplied artwork (see the analysis in scripts/README.md).
PAPER = np.array([249.0, 239.0, 229.0])
INK = np.array([42.0, 54.0, 40.0])        # the logo's forest green
CREAM = np.array([245.0, 240.0, 231.0])   # brand cream, for reversed art

# Crops, in source pixels, measured from the ink's own bounding boxes.
FULL_LOCKUP = (173, 209, 1085, 957)
MONOGRAM = (419, 217, 915, 709)
WORDMARK = (185, 720, 1073, 870)


def coverage(rgb: np.ndarray) -> np.ndarray:
    """Ink coverage 0..1, recovered per pixel from the paper/ink model."""
    paper_l = PAPER.mean()
    ink_l = INK.mean()
    lum = rgb.mean(axis=2)
    a = (paper_l - lum) / (paper_l - ink_l)
    return np.clip(a, 0.0, 1.0)


def render(alpha: np.ndarray, ink: np.ndarray) -> Image.Image:
    h, w = alpha.shape
    out = np.zeros((h, w, 4), dtype=np.uint8)
    out[..., 0] = ink[0]
    out[..., 1] = ink[1]
    out[..., 2] = ink[2]
    out[..., 3] = (alpha * 255).round().astype(np.uint8)
    return Image.fromarray(out, 'RGBA')


def derive(box, stem):
    crop = np.asarray(Image.open(SRC).convert('RGB').crop(box)).astype(np.float32)
    alpha = coverage(crop)
    render(alpha, INK).save(OUT / f'{stem}.png')
    render(alpha, CREAM).save(OUT / f'{stem}-reversed.png')
    print(f'  {stem}.png / {stem}-reversed.png  {crop.shape[1]}x{crop.shape[0]}')
    return alpha


def main():
    print('Deriving RAIGE brand assets from the supplied artwork...')
    derive(FULL_LOCKUP, 'raige-lockup')
    derive(WORDMARK, 'raige-wordmark')
    mono = derive(MONOGRAM, 'raige-monogram')

    # Favicon: the monogram reversed onto a forest ground, square.
    size = 256
    h, w = mono.shape
    side = max(h, w)
    square = np.zeros((side, side), dtype=np.float32)
    y0 = (side - h) // 2
    x0 = (side - w) // 2
    square[y0:y0 + h, x0:x0 + w] = mono

    mark = render(square, CREAM).resize((size, size), Image.LANCZOS)
    # Inset the mark so it is not flush to the tile edge.
    pad = int(size * 0.16)
    inner = mark.resize((size - pad * 2, size - pad * 2), Image.LANCZOS)
    tile = Image.new('RGBA', (size, size), (24, 52, 38, 255))  # --forest
    tile.paste(inner, (pad, pad), inner)
    tile.save(PUBLIC / 'favicon.png')
    print(f'  public/favicon.png  {size}x{size}')
    print('Done.')


if __name__ == '__main__':
    main()
