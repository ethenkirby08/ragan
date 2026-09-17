/* ============================================================
   RAIGE — Brand marks

   Vector reconstructions of the official logo lockup, kept as inline
   SVG so they stay crisp at any size, recolour with `currentColor`,
   and carry no background.

   The supplied artwork lives at src/assets/brand/raige-logo-original.jpg
   and remains the source of truth for proportion and construction.
   TODO: swap these for the official vector (.svg) files when supplied.
   ============================================================ */

type MarkProps = {
  className?: string;
  title?: string;
};

/**
 * The monogram: a serif R with the flagstick running through it.
 * Used in the navigation, the loader and the favicon.
 */
export function RaigeMonogram({ className, title = 'RAIGE' }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 100"
      role="img"
      aria-label={title}
      fill="none"
    >
      <text
        x="52"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontSize="84"
        fontWeight="500"
        fill="currentColor"
      >
        R
      </text>

      {/* Flagstick */}
      <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
        <line x1="38" y1="14" x2="38" y2="80" />
        <path d="M31 80 Q38 84 45 80" fill="none" />
      </g>
      <circle cx="38" cy="13" r="2.2" fill="currentColor" />
      {/* Pennant */}
      <path
        d="M38.8 16.5 C 48 17.5, 56 20.5, 62 25 C 55 27.5, 46 29.2, 38.8 29.4 Z"
        fill="currentColor"
      />
    </svg>
  );
}

/**
 * The wordmark on its own, for the navigation bar.
 * `textLength` pins the drawn width so the lockup's geometry never
 * depends on which font actually finished loading.
 */
export function RaigeWordmark({ className, title = 'RAIGE' }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 220 44"
      role="img"
      aria-label={title}
      fill="none"
    >
      <text
        x="110"
        y="24"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="var(--font-display)"
        fontSize="34"
        fontWeight="500"
        fill="currentColor"
        textLength="186"
        lengthAdjust="spacing"
      >
        RAIGE
      </text>
    </svg>
  );
}

/**
 * The full lockup, as it appears on the supplied artwork:
 * monogram, EST. 2026, wordmark, and the ruled descriptor.
 */
export function RaigeLockup({ className, title = 'RAIGE — Southern and Golf Apparel' }: MarkProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 420 300"
      role="img"
      aria-label={title}
      fill="none"
    >
      {/* Monogram */}
      <g transform="translate(160 6) scale(1.0)">
        <text
          x="52"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-display)"
          fontSize="84"
          fontWeight="500"
          fill="currentColor"
        >
          R
        </text>
        <g stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
          <line x1="38" y1="14" x2="38" y2="80" />
          <path d="M31 80 Q38 84 45 80" fill="none" />
        </g>
        <circle cx="38" cy="13" r="2.2" fill="currentColor" />
        <path
          d="M38.8 16.5 C 48 17.5, 56 20.5, 62 25 C 55 27.5, 46 29.2, 38.8 29.4 Z"
          fill="currentColor"
        />
      </g>

      {/* EST. 2026, flanking the monogram */}
      <text
        x="96"
        y="62"
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontSize="13"
        fontWeight="500"
        letterSpacing="3.4"
        fill="currentColor"
      >
        EST.
      </text>
      <text
        x="330"
        y="62"
        textAnchor="middle"
        fontFamily="var(--font-sans)"
        fontSize="13"
        fontWeight="500"
        letterSpacing="3.4"
        fill="currentColor"
      >
        2026
      </text>

      {/* Wordmark */}
      <text
        x="210"
        y="170"
        textAnchor="middle"
        fontFamily="var(--font-display)"
        fontSize="72"
        fontWeight="500"
        fill="currentColor"
        textLength="300"
        lengthAdjust="spacing"
      >
        RAIGE
      </text>

      {/* Ruled descriptor */}
      <g opacity="0.92">
        {/* The descriptor is pinned to 244px wide and centred on 210, so
            it spans 88–332. The rules sit clear of that on either side. */}
        <line x1="30" y1="212" x2="74" y2="212" stroke="currentColor" strokeWidth="1.6" />
        <text
          x="210"
          y="217"
          textAnchor="middle"
          fontFamily="var(--font-sans)"
          fontSize="12"
          fontWeight="500"
          fill="currentColor"
          textLength="244"
          lengthAdjust="spacing"
        >
          SOUTHERN AND GOLF APPAREL
        </text>
        <line x1="346" y1="212" x2="390" y2="212" stroke="currentColor" strokeWidth="1.6" />
      </g>
    </svg>
  );
}
