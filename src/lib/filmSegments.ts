import { smootherstep } from './motion';

/* ============================================================
   RAIGE — Film segments

   The film is not a continuous animation scrubbed by raw scroll. It is a
   series of shots, each with a place it comes to rest.

   That is expressed by SHAPING the scroll-to-timeline mapping rather
   than by snapping, magnetism, or any system that waits for scroll to
   stop and then takes over. Each segment owns a slice of the scroll
   runway, and within that slice:

       ├──────── travel ────────┤├────── dwell ──────┤
       timeline moves to the       timeline does not
       segment's resting point     move at all

   Stop anywhere in a dwell zone — which is roughly 40% of the runway —
   and the scene is already still. Keep scrolling and the next shot
   begins. That produces the observe → move → observe rhythm without the
   page ever grabbing the scroll away from the reader.

   Because this is a pure, monotonic function of scroll position, three
   things come free that a snapping system has to work for:

     - a small accidental scroll inside a dwell zone moves nothing,
       so no hysteresis logic is needed
     - reverse scrolling replays the shots exactly backwards
     - the film cannot loop or restart: at scroll 1 it is at 1, and
       there is no state anywhere that could roll it back to the tee

   The output feeds the damped, speed-limited timeline in scrollStore,
   so this shaping decides WHERE the film rests and that damping decides
   how fast it is allowed to travel between rests.
   ============================================================ */

export type Segment = {
  id: string;
  /** For debugging and for the dev overlay. */
  name: string;
  /** Where this shot comes to rest on the cinematic timeline, 0 → 1. */
  hold: number;
  /** Share of the scroll runway. Bigger = more scrolling spent here. */
  weight: number;
  /**
   * Fraction of this segment's scroll spent moving. The remainder is the
   * dwell — the part where the viewer can stop and look at a still frame.
   */
  travel: number;
};

/**
 * The shot list.
 *
 * `hold` values line up with the chapter windows in sections/story.tsx,
 * so every resting point is also a moment where its typography is fully
 * open. Move a hold and the matching chapter window moves with it.
 */
export const SEGMENTS: Segment[] = [
  // The establishing shot. A slow push in, then the scene sits still
  // with the lockup up while the viewer takes it in.
  { id: 'tee', name: 'First Tee', hold: 0.075, weight: 1.15, travel: 0.5 },
  // The club enters frame. Deliberate, unhurried.
  { id: 'approach', name: 'Approach', hold: 0.165, weight: 0.95, travel: 0.62 },
  // Contact.
  { id: 'impact', name: 'Impact', hold: 0.212, weight: 0.8, travel: 0.58 },
  // The ball is away and the shot holds on it. This rest matters: it is
  // where a viewer who swiped once gets to actually watch the ball fly.
  { id: 'launch', name: 'Launch', hold: 0.275, weight: 1.0, travel: 0.55 },
  { id: 'flight', name: 'Flight', hold: 0.355, weight: 0.95, travel: 0.6 },
  // The top of the arc, and the widest view of the course.
  { id: 'apex', name: 'Apex', hold: 0.515, weight: 1.2, travel: 0.62 },
  { id: 'collection', name: 'The Collection', hold: 0.655, weight: 1.0, travel: 0.6 },
  { id: 'craft', name: 'Craft', hold: 0.755, weight: 0.95, travel: 0.6 },
  { id: 'categories', name: 'The Range', hold: 0.84, weight: 0.9, travel: 0.6 },
  { id: 'descent', name: 'Descent', hold: 0.9, weight: 0.85, travel: 0.64 },
  { id: 'green', name: 'The Green', hold: 0.958, weight: 1.0, travel: 0.6 },
  // The cup, and the end of the film. It stays here.
  { id: 'clubhouse', name: 'Clubhouse', hold: 1.0, weight: 1.15, travel: 0.5 },
];

/** Cumulative scroll boundaries, derived once from the weights. */
const BOUNDS = (() => {
  const total = SEGMENTS.reduce((sum, s) => sum + s.weight, 0);
  const edges: number[] = [0];
  let acc = 0;
  for (const segment of SEGMENTS) {
    acc += segment.weight / total;
    edges.push(acc);
  }
  // Guard against floating-point drift at the end.
  edges[edges.length - 1] = 1;
  return edges;
})();

export const segmentBounds = () => BOUNDS.slice();

/**
 * Scroll position → cinematic timeline position.
 *
 * Monotonic and clamped, so it can never run backwards on its own or
 * wrap around. This is the only place scroll is interpreted.
 */
export function shapeScroll(scroll: number): number {
  if (scroll <= 0) return 0;
  if (scroll >= 1) return 1;

  // Which shot are we in?
  let index = 0;
  while (index < SEGMENTS.length - 1 && scroll >= BOUNDS[index + 1]) index++;

  const segment = SEGMENTS[index];
  const start = BOUNDS[index];
  const end = BOUNDS[index + 1];
  const span = end - start || 1;
  const local = (scroll - start) / span;

  // The film begins at 0, so the first shot travels up from there.
  const from = index === 0 ? 0 : SEGMENTS[index - 1].hold;
  const to = segment.hold;

  if (local >= segment.travel) return to; // dwell: nothing moves
  const t = local / (segment.travel || 1);
  return from + (to - from) * smootherstep(0, 1, t);
}

/** Which shot a given scroll position belongs to. For diagnostics. */
export function segmentAt(scroll: number): { index: number; segment: Segment; dwelling: boolean } {
  const clamped = scroll <= 0 ? 0 : scroll >= 1 ? 1 : scroll;
  let index = 0;
  while (index < SEGMENTS.length - 1 && clamped >= BOUNDS[index + 1]) index++;
  const segment = SEGMENTS[index];
  const span = BOUNDS[index + 1] - BOUNDS[index] || 1;
  const local = (clamped - BOUNDS[index]) / span;
  return { index, segment, dwelling: local >= segment.travel };
}
