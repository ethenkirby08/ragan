/* ============================================================
   RAIGE — Scroll store

   A single source of truth for "where are we in the film".
   One ScrollTrigger writes to it; the 3D scene reads it inside
   useFrame and the HTML chapters subscribe to it and mutate style
   directly. Nothing here touches React state, so scrolling never
   triggers a re-render — that is what keeps the experience at 60fps.
   ============================================================ */

type Listener = (progress: number) => void;

const listeners = new Set<Listener>();

/** Cinematic timeline position, 0 → 1. */
let progress = 0;
/** True once the user has moved at all — used to retire the scroll cue. */
let hasMoved = false;

export const scrollStore = {
  get: () => progress,

  set(next: number) {
    const clamped = next < 0 ? 0 : next > 1 ? 1 : next;
    if (clamped === progress) return;
    progress = clamped;
    if (clamped > 0.002) hasMoved = true;
    for (const listener of listeners) listener(clamped);
  },

  /** Subscribe and receive the current value immediately. */
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(progress);
    return () => {
      listeners.delete(listener);
    };
  },

  hasMoved: () => hasMoved,

  /** Used when navigating away, so a remount starts from a clean slate. */
  reset() {
    progress = 0;
    hasMoved = false;
    for (const listener of listeners) listener(0);
  },
};

/* ------------------------------------------------------------
   THE CINEMATIC TIMELINE

   Every beat of the homepage is expressed as a window on the same
   0→1 timeline. Retiming the film means editing these numbers and
   nothing else — the 3D scene, the camera and the typography all
   read from here.
   ------------------------------------------------------------ */
export const BEATS = {
  /** Ball at rest on the tee. The scene breathes. */
  tee: [0.0, 0.11],
  /** The club enters frame. Tension builds. */
  approach: [0.11, 0.185],
  /** Contact. */
  impact: [0.185, 0.215],
  /** Launch and climb. */
  flight: [0.215, 0.44],
  /** Apex — the course opens up below. */
  apex: [0.44, 0.56],
  /** The environment turns editorial. Apparel arrives. */
  collection: [0.56, 0.7],
  /** The signature product. */
  product: [0.7, 0.8],
  /** Categories as destinations. */
  categories: [0.8, 0.86],
  /** Descent to the green. */
  descent: [0.86, 0.93],
  /** Landing, roll, and the cup. */
  green: [0.93, 0.985],
  /** The clubhouse door opens. */
  clubhouse: [0.985, 1.0],
} as const;

export type BeatName = keyof typeof BEATS;
