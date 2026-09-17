/* ============================================================
   RAIGE — Motion math
   Small, pure helpers. Every cinematic value in this project is a
   pure function of scroll progress, which is what makes the whole
   experience perfectly reversible when the user scrolls back up.
   ============================================================ */

export const clamp = (v: number, min = 0, max = 1) =>
  v < min ? min : v > max ? max : v;

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Remap `v` from one range to another, clamped to the output range. */
export const mapRange = (
  v: number,
  inMin: number,
  inMax: number,
  outMin = 0,
  outMax = 1,
) => {
  if (inMax === inMin) return outMin;
  return lerp(outMin, outMax, clamp((v - inMin) / (inMax - inMin)));
};

/** Hermite ease — the workhorse. Soft in, soft out, no overshoot. */
export const smoothstep = (edge0: number, edge1: number, v: number) => {
  const t = clamp((v - edge0) / (edge1 - edge0 || 1));
  return t * t * (3 - 2 * t);
};

/** Even softer than smoothstep — used for long, heavy camera moves. */
export const smootherstep = (edge0: number, edge1: number, v: number) => {
  const t = clamp((v - edge0) / (edge1 - edge0 || 1));
  return t * t * t * (t * (t * 6 - 15) + 10);
};

/* ---- Easing curves ---- */
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInCubic = (t: number) => t * t * t;
export const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);
export const easeInQuad = (t: number) => t * t;
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/**
 * Frame-rate independent damping.
 * Standard `lerp(current, target, 0.1)` moves faster on a 120Hz display than
 * on a 60Hz one; this keeps the feel identical on every machine.
 */
export const damp = (
  current: number,
  target: number,
  smoothing: number,
  dt: number,
) => lerp(current, target, 1 - Math.exp(-smoothing * dt));

/**
 * A visibility envelope: fades in over [inStart,inEnd], holds at 1,
 * then fades out over [outStart,outEnd]. The core of every text reveal.
 */
export const envelope = (
  p: number,
  inStart: number,
  inEnd: number,
  outStart: number,
  outEnd: number,
) => smoothstep(inStart, inEnd, p) * (1 - smoothstep(outStart, outEnd, p));

/** Deterministic pseudo-random — procedural scenery that never re-shuffles. */
export const seeded = (seed: number) => {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
};
