# Scripts

## `derive-brand-assets.py`

Regenerates the web-ready RAIGE logo files from the single supplied
artwork, `src/assets/brand/raige-logo-original.jpg`.

```bash
pip install pillow numpy
python3 scripts/derive-brand-assets.py
```

### Why a script rather than hand-made files

The logo must not be redrawn, re-lettered or re-proportioned. This script
makes that guaranteed rather than promised: it never draws anything.

The artwork is ink printed on cream paper, so every pixel is

```
observed = paper * (1 - a) + ink * a
```

Solving for `a` recovers the ink's coverage — every curve, serif and
antialiased edge exactly as supplied. That measured alpha becomes the PNG's
alpha channel untouched. The only choice the script makes is which ink the
alpha carries:

- **normal** — the artwork's own forest green `rgb(42, 54, 40)`, for cream
  and other light grounds
- **reversed** — brand cream `rgb(245, 240, 231)`, for dark grounds where
  the forest ink would be invisible

Shapes, spacing, typography, wording and the flag/R monogram are identical
in both, because they are the alpha channel and the alpha channel is
measured from the original.

Verified: compositing `raige-lockup.png` back over the paper colour
reproduces the source crop with a mean deviation of **0.91/255**.

### Measurements

Taken from the artwork itself, not estimated:

| | value |
|---|---|
| Source | 1254 × 1254 |
| Paper | `rgb(249, 239, 229)` |
| Ink | `rgb(42, 54, 40)` |
| Full lockup ink box | x 197–1061, y 233–932 |
| Monogram ink box | x 435–899, y 233–693 |
| Wordmark ink box | x 197–1061, y 732–858 |

Crops add a small padding around those boxes.

### Output

| File | Use |
|---|---|
| `raige-lockup.png` / `-reversed.png` | Hero lockup, footer |
| `raige-wordmark.png` / `-reversed.png` | Navigation wordmark |
| `raige-monogram.png` / `-reversed.png` | Navigation mark, loader |
| `public/favicon.png` | Browser tab |

If official vector artwork ever arrives, drop it in and retire this script.
