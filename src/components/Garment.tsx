import { useId } from 'react';

/* ============================================================
   RAIGE — Garment illustrations

   Drawn in code rather than photographed. Until the real campaign is
   shot, these keep every product on screen consistently art-directed:
   one light source, one palette, one hand.

   TODO: replace with the RAIGE campaign photography — see
   src/assets/products/README.md for the drop-in path and naming.
   ============================================================ */

export type GarmentKind =
  | 'polo'
  | 'quarter-zip'
  | 'cap'
  | 'headcover'
  | 'belt'
  | 'trouser';

export type Colorway = 'forest' | 'cream' | 'sand' | 'black';

const COLORWAYS: Record<
  Colorway,
  { base: string; shade: string; light: string; detail: string; label: string }
> = {
  forest: { base: '#1d3b2a', shade: '#132719', light: '#2c5239', detail: '#0e1f15', label: 'Forest' },
  cream: { base: '#f0eadc', shade: '#d9d0bd', light: '#fbf7ee', detail: '#b9ae97', label: 'Cream' },
  sand: { base: '#d8d1c5', shade: '#b8ae9d', light: '#e9e4d9', detail: '#9d9382', label: 'Sand' },
  black: { base: '#232520', shade: '#131510', light: '#34372f', detail: '#0b0d09', label: 'Warm Black' },
};

export const colorwayLabel = (c: Colorway) => COLORWAYS[c].label;
export const colorwaySwatch = (c: Colorway) => COLORWAYS[c].base;

type Props = {
  kind: GarmentKind;
  colorway?: Colorway;
  className?: string;
  /** Decorative by default; pass a label when the garment carries meaning. */
  label?: string;
};

export default function Garment({ kind, colorway = 'forest', className, label }: Props) {
  const uid = useId().replace(/:/g, '');
  const c = COLORWAYS[colorway];

  const defs = (
    <defs>
      {/* Cloth falls away from a single high-left key, matching the 3D scene. */}
      <linearGradient id={`cloth-${uid}`} x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0%" stopColor={c.light} />
        <stop offset="46%" stopColor={c.base} />
        <stop offset="100%" stopColor={c.shade} />
      </linearGradient>
      <linearGradient id={`sleeve-${uid}`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor={c.base} />
        <stop offset="100%" stopColor={c.shade} />
      </linearGradient>
      {/* A whisper of ambient occlusion where the garment folds. */}
      <linearGradient id={`fold-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c.detail} stopOpacity="0.28" />
        <stop offset="100%" stopColor={c.detail} stopOpacity="0" />
      </linearGradient>
    </defs>
  );

  const cloth = `url(#cloth-${uid})`;
  const sleeve = `url(#sleeve-${uid})`;
  const fold = `url(#fold-${uid})`;

  const common = {
    className,
    role: label ? ('img' as const) : undefined,
    'aria-label': label,
    'aria-hidden': label ? undefined : true,
  };

  if (kind === 'polo' || kind === 'quarter-zip') {
    const isZip = kind === 'quarter-zip';
    return (
      <svg {...common} viewBox="0 0 300 340" fill="none">
        {defs}

        {/* Sleeves sit behind the body so the shoulder seam stays clean,
            and carry their own darker tone so the silhouette separates. */}
        <path d="M114 82 C90 88 68 106 57 133 L80 172 C89 151 98 129 110 113 Z" fill={sleeve} />
        <path d="M186 82 C210 88 232 106 243 133 L220 172 C211 151 202 129 190 113 Z" fill={sleeve} />
        {/* Cuff bands */}
        <path d="M62 144 L85 163 L80 174 L57 153 Z" fill={c.shade} opacity="0.75" />
        <path d="M238 144 L215 163 L220 174 L243 153 Z" fill={c.shade} opacity="0.75" />

        {/* Body: shoulders, a slight waist, then a flare to the hem */}
        <path
          d="M110 80 L190 80 L196 146 L203 300 Q203 307 196 307 L104 307 Q97 307 97 300 L104 146 Z"
          fill={cloth}
        />

        {/* Fabric falls into shadow at both sides and lifts down the
            centre — without this the garment reads as a flat shape. */}
        <path d="M97 300 L104 146 L120 149 L114 307 L104 307 Q97 307 97 300 Z" fill={fold} opacity="0.85" />
        <path d="M203 300 L196 146 L181 149 L186 307 L196 307 Q203 307 203 300 Z" fill={fold} opacity="0.6" />
        <ellipse cx="150" cy="210" rx="30" ry="86" fill={c.light} opacity="0.13" />
        {/* Hem shadow */}
        <path d="M99 288 L201 288 L203 300 Q203 307 196 307 L104 307 Q97 307 97 300 Z" fill={c.detail} opacity="0.12" />

        {isZip ? (
          <>
            {/* Stand collar */}
            <path
              d="M126 82 Q150 68 174 82 L174 46 Q150 32 126 46 Z"
              fill={cloth}
              stroke={c.detail}
              strokeWidth="1.3"
            />
            <path d="M126 64 Q150 50 174 64" stroke={c.detail} strokeWidth="0.9" opacity="0.4" fill="none" />
            {/* Zip, to the quarter point */}
            <line x1="150" y1="42" x2="150" y2="152" stroke={c.detail} strokeWidth="2.4" />
            <rect x="145.5" y="143" width="9" height="17" rx="3" fill="#a88a58" />
          </>
        ) : (
          <>
            {/* Neckline */}
            <path d="M131 80 Q150 95 169 80" fill={c.shade} opacity="0.6" />
            {/* Collar: a band with two points spreading from the placket */}
            <path d="M131 80 L112 71 L119 108 L145 90 Z" fill={cloth} stroke={c.detail} strokeWidth="1.1" />
            <path d="M169 80 L188 71 L181 108 L155 90 Z" fill={cloth} stroke={c.detail} strokeWidth="1.1" />
            <path d="M112 71 L119 108" stroke={c.detail} strokeWidth="0.8" opacity="0.35" />
            <path d="M188 71 L181 108" stroke={c.detail} strokeWidth="0.8" opacity="0.35" />
            {/* Placket */}
            <rect x="143" y="88" width="14" height="56" fill={c.shade} opacity="0.5" />
            <line x1="143" y1="88" x2="143" y2="144" stroke={c.detail} strokeWidth="1" opacity="0.7" />
            <line x1="157" y1="88" x2="157" y2="144" stroke={c.detail} strokeWidth="1" opacity="0.7" />
            <circle cx="150" cy="103" r="3.2" fill={c.detail} opacity="0.85" />
            <circle cx="150" cy="127" r="3.2" fill={c.detail} opacity="0.85" />
          </>
        )}

        {/* The monogram, at the scale it is actually embroidered */}
        <text
          x="186"
          y="176"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="24"
          fontWeight="500"
          fill={c.detail}
          opacity="0.8"
        >
          R
        </text>
      </svg>
    );
  }

  if (kind === 'cap') {
    return (
      <svg {...common} viewBox="0 0 300 220" fill="none">
        {defs}
        {/* Crown */}
        <path d="M62 146 C62 78 100 44 150 44 C200 44 238 78 238 146 Z" fill={cloth} />
        {/* Panel seams */}
        <path d="M150 44 L150 146" stroke={c.detail} strokeWidth="1.1" opacity="0.4" />
        <path d="M104 52 C96 86 94 118 96 146" stroke={c.detail} strokeWidth="1" opacity="0.28" fill="none" />
        <path d="M196 52 C204 86 206 118 204 146" stroke={c.detail} strokeWidth="1" opacity="0.28" fill="none" />
        {/* Button */}
        <circle cx="150" cy="46" r="5" fill={c.detail} />
        {/* Brim */}
        <path
          d="M58 146 C58 146 92 168 150 168 C208 168 242 146 242 146 C250 162 244 178 214 186 C186 193 114 193 86 186 C56 178 50 162 58 146 Z"
          fill={sleeve}
        />
        {/* Front mark */}
        <text
          x="150"
          y="118"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="34"
          fontWeight="500"
          letterSpacing="4"
          fill={c.detail}
          opacity="0.88"
        >
          R
        </text>
      </svg>
    );
  }

  if (kind === 'headcover') {
    return (
      <svg {...common} viewBox="0 0 300 340" fill="none">
        {defs}
        {/* Tapered sock */}
        <path
          d="M118 96 C118 70 182 70 182 96 L196 232 C200 268 186 300 150 300 C114 300 100 268 104 232 Z"
          fill={cloth}
        />
        {/* Ribbed cuff */}
        <path d="M110 232 L192 232 L194 252 L108 252 Z" fill={c.shade} opacity="0.7" />
        <g stroke={c.detail} strokeWidth="1" opacity="0.4">
          <line x1="122" y1="234" x2="122" y2="250" />
          <line x1="136" y1="234" x2="136" y2="250" />
          <line x1="150" y1="234" x2="150" y2="250" />
          <line x1="164" y1="234" x2="164" y2="250" />
          <line x1="178" y1="234" x2="178" y2="250" />
        </g>
        {/* Pom */}
        <circle cx="150" cy="74" r="26" fill={sleeve} />
        <circle cx="150" cy="74" r="26" fill={fold} />
        {/* Mark */}
        <text
          x="150"
          y="182"
          textAnchor="middle"
          fontFamily="var(--font-display)"
          fontSize="40"
          fontWeight="500"
          fill={c.detail}
          opacity="0.85"
        >
          R
        </text>
      </svg>
    );
  }

  if (kind === 'belt') {
    return (
      <svg {...common} viewBox="0 0 340 160" fill="none">
        {defs}
        <rect x="18" y="62" width="268" height="36" rx="4" fill={cloth} />
        <line x1="18" y1="72" x2="286" y2="72" stroke={c.detail} strokeWidth="0.9" opacity="0.35" />
        <line x1="18" y1="88" x2="286" y2="88" stroke={c.detail} strokeWidth="0.9" opacity="0.35" />
        {/* Brass buckle — the one place the metallic is allowed to speak */}
        <rect
          x="268"
          y="50"
          width="54"
          height="60"
          rx="6"
          fill="none"
          stroke="#a88a58"
          strokeWidth="7"
        />
        <line x1="268" y1="80" x2="300" y2="80" stroke="#a88a58" strokeWidth="5" />
        <g fill={c.detail} opacity="0.55">
          <circle cx="72" cy="80" r="3" />
          <circle cx="104" cy="80" r="3" />
          <circle cx="136" cy="80" r="3" />
        </g>
      </svg>
    );
  }

  // trouser
  return (
    <svg {...common} viewBox="0 0 300 380" fill="none">
      {defs}
      <path
        d="M96 40 L204 40 L210 92 L196 352 L160 352 L150 152 L140 352 L104 352 L90 92 Z"
        fill={cloth}
      />
      {/* Waistband */}
      <rect x="94" y="36" width="112" height="24" fill={c.shade} opacity="0.75" />
      <line x1="94" y1="60" x2="206" y2="60" stroke={c.detail} strokeWidth="1" opacity="0.5" />
      {/* Crease lines — the detail that makes tailoring read as tailoring */}
      <line x1="124" y1="72" x2="118" y2="348" stroke={c.detail} strokeWidth="1.1" opacity="0.3" />
      <line x1="176" y1="72" x2="182" y2="348" stroke={c.detail} strokeWidth="1.1" opacity="0.3" />
      <path d="M150 60 L150 150" stroke={c.detail} strokeWidth="1" opacity="0.35" />
    </svg>
  );
}
