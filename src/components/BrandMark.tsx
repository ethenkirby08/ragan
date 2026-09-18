import lockupInk from '../assets/brand/raige-lockup.png';
import lockupCream from '../assets/brand/raige-lockup-reversed.png';
import wordmarkInk from '../assets/brand/raige-wordmark.png';
import wordmarkCream from '../assets/brand/raige-wordmark-reversed.png';
import monogramInk from '../assets/brand/raige-monogram.png';
import monogramCream from '../assets/brand/raige-monogram-reversed.png';
import './brand-mark.css';

/* ============================================================
   RAIGE — Brand marks

   These render the SUPPLIED ARTWORK, not a reconstruction of it.

   Each file is derived from src/assets/brand/raige-logo-original.jpg by
   scripts/derive-brand-assets.py, which recovers the ink's coverage from
   the paper/ink model and keeps it as the alpha channel. Nothing is
   redrawn: the letterforms, spacing, proportions, wording and the flag/R
   monogram are the original's own pixels.

   Two inks exist for legibility, not for design: the artwork's forest
   green for light grounds, and brand cream for dark ones.
   ============================================================ */

type Tone = 'ink' | 'cream' | 'auto';

type MarkProps = {
  className?: string;
  /** Accessible name. Pass "" for decorative marks beside real text. */
  title?: string;
  /**
   * 'ink'   — forest, for cream and other light grounds
   * 'cream' — reversed, for dark grounds
   * 'auto'  — render both and let CSS cross-fade them, for surfaces whose
   *           colour changes underneath the mark (the navigation does this)
   */
  tone?: Tone;
};

const ART = {
  lockup: { ink: lockupInk, cream: lockupCream },
  wordmark: { ink: wordmarkInk, cream: wordmarkCream },
  monogram: { ink: monogramInk, cream: monogramCream },
} as const;

function Mark({
  art,
  className,
  title = 'RAIGE',
  tone = 'ink',
}: MarkProps & { art: keyof typeof ART }) {
  const sources = ART[art];
  const classes = `mark mark--${art}${className ? ` ${className}` : ''}`;

  if (tone === 'auto') {
    return (
      <span className={`${classes} mark--auto`} role="img" aria-label={title || undefined}>
        <img className="mark__img mark__img--ink" src={sources.ink} alt="" aria-hidden="true" />
        <img className="mark__img mark__img--cream" src={sources.cream} alt="" aria-hidden="true" />
      </span>
    );
  }

  return (
    <img
      className={`${classes} mark__img`}
      src={tone === 'cream' ? sources.cream : sources.ink}
      alt={title}
      draggable={false}
    />
  );
}

/** The monogram: the serif R with the flagstick running through it. */
export function RaigeMonogram(props: MarkProps) {
  return <Mark art="monogram" {...props} />;
}

/** The wordmark on its own. */
export function RaigeWordmark(props: MarkProps) {
  return <Mark art="wordmark" {...props} />;
}

/** The full lockup: monogram, EST. 2026, wordmark and ruled descriptor. */
export function RaigeLockup(props: MarkProps) {
  return <Mark art="lockup" {...props} />;
}
