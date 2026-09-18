/* ============================================================
   RAIGE — Cinematic timeline

   One source of truth for "where are we in the film".

   Scroll does not drive the film directly. It sets a TARGET, and the
   timeline travels toward that target under two constraints:

     1. exponential damping  — it eases in and out rather than snapping
     2. a hard speed limit   — it can only advance so fast per second

   The speed limit is the important one. Without it a single fast swipe
   on a phone moves the scroll position through most of the film in a few
   frames, the ball leaps across the sky, and the viewer loses all sense
   of where they are. With it, a flick still gets you down the page at
   full speed — the page scrolls normally — but the film plays through at
   a readable rate and settles exactly where the scroll left it.

   Everything visual reads the damped value: the 3D scene, the camera,
   and every chapter of typography. Because they share one number they
   cannot drift apart, and because that number is only ever integrated
   toward a clamped target, scrolling backwards replays the film in
   reverse without drift or snapping.

   Nothing here touches React state, so scrolling costs no renders.
   ============================================================ */

type Listener = (progress: number) => void;

const listeners = new Set<Listener>();

/** Where scroll says we should be, 0 → 1. */
let target = 0;
/** Where the film actually is, 0 → 1. This is what everything renders. */
let value = 0;
/** Signed progress-per-second of the timeline, for motion-dependent effects. */
let velocity = 0;
/** True once the viewer has moved at all — retires the scroll cue. */
let moved = false;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/* ------------------------------------------------------------
   Tuning

   `smoothing` is the exponential approach rate; higher is tighter.
   `maxSpeed` is the ceiling on timeline progress per second — the film
   cannot advance faster than this however hard the page is flung.

   A phone gets both a softer approach and a lower ceiling: touch
   momentum delivers far larger deltas than a wheel, and the screen is
   small enough that a fast-moving ball leaves frame in a blink.
   ------------------------------------------------------------ */
export const TUNING = {
  desktop: { smoothing: 7.5, maxSpeed: 0.55 },
  mobile: { smoothing: 4.6, maxSpeed: 0.33 },
} as const;

let tuning: { smoothing: number; maxSpeed: number } = TUNING.desktop;

/** Snapping the last sliver keeps the film from creeping forever. */
const SETTLE = 0.00035;
/** Integration sub-step. Small enough that the easing stays frame-rate fair. */
const SUB_STEP = 1 / 60;
/** Absorbs a backgrounded tab returning with a multi-second frame. */
const MAX_FRAME = 0.25;

function notify() {
  for (const listener of listeners) listener(value);
}

export const scrollStore = {
  /** The damped timeline position. Render from this, always. */
  get: () => value,

  /** Where scroll currently points. Diagnostics only — do not render from it. */
  getTarget: () => target,

  /** Signed timeline speed, progress per second. */
  getVelocity: () => velocity,

  /** Called by the scroll driver. Sets where the film should be heading. */
  setTarget(next: number) {
    target = clamp01(next);
    if (target > 0.002) moved = true;
  },

  /**
   * Advances the film toward the target. Called once per frame from the
   * shared ticker so scroll and animation stay on one clock.
   */
  advance(dt: number) {
    if (Math.abs(target - value) < SETTLE) {
      if (value !== target) {
        value = target;
        velocity = 0;
        notify();
      } else if (velocity !== 0) {
        velocity = 0;
      }
      return;
    }

    /*
      Integrated in fixed sub-steps rather than in one jump.

      Clamping a long frame down to a single short step looks like it
      protects against a leap, but it also means a device rendering at
      12fps advances the film at a fifth of real time — the story quietly
      falls into slow motion exactly on the hardware that can least afford
      to spend longer on it. Sub-stepping keeps the speed limit honest in
      SECONDS on every device, while a total cap still absorbs the one
      genuinely pathological case: a tab that was backgrounded.
    */
    const elapsed = Math.min(Math.max(dt, 0), MAX_FRAME);
    let remaining = elapsed;
    let moved = 0;

    while (remaining > 0) {
      const step = Math.min(remaining, SUB_STEP);
      remaining -= step;

      const diff = target - value;
      if (Math.abs(diff) < SETTLE) {
        value = target;
        break;
      }

      // Ease toward the target...
      let delta = diff * (1 - Math.exp(-tuning.smoothing * step));
      // ...but never faster than the ceiling. This is the anti-teleport rule.
      const limit = tuning.maxSpeed * step;
      if (delta > limit) delta = limit;
      else if (delta < -limit) delta = -limit;

      value = clamp01(value + delta);
      moved += delta;
    }

    velocity = elapsed > 0 ? moved / elapsed : 0;
    notify();
  },

  /** Phones get stronger damping and a lower ceiling than desktops. */
  setProfile(profile: keyof typeof TUNING) {
    tuning = TUNING[profile];
  },

  /** Used by the reduced-motion edit, which presents the film as a document. */
  jumpTo(next: number) {
    target = clamp01(next);
    value = target;
    velocity = 0;
    notify();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(value);
    return () => {
      listeners.delete(listener);
    };
  },

  hasMoved: () => moved,

  reset() {
    target = 0;
    value = 0;
    velocity = 0;
    moved = false;
    notify();
  },
};

/* ------------------------------------------------------------
   THE CINEMATIC TIMELINE

   Every beat of the homepage is a window on the same 0→1 timeline.
   Retiming the film means editing these numbers and nothing else.
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

/*
  Development-only handle. Automated visual checks need to know when the
  film has finished travelling to the scroll position before they can
  screenshot it — the speed limit means "scrolled" and "arrived" are no
  longer the same moment.
*/
if (import.meta.env.DEV) {
  (window as unknown as { __raigeTimeline?: unknown }).__raigeTimeline = {
    value: () => value,
    target: () => target,
    velocity: () => velocity,
    // Same threshold the store itself settles at, so a test that waits
    // for this is waiting for the film to have genuinely stopped.
    settled: () => value === target || Math.abs(target - value) < SETTLE,
  };
}
