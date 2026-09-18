import * as THREE from 'three';
import {
  clamp,
  smootherstep,
  smoothstep,
  mapRange,
  easeOutCubic,
  easeInCubic,
} from '../lib/motion';

/* ============================================================
   RAIGE — Cinematics

   The ball's flight and the camera that follows it, expressed as
   PURE FUNCTIONS of timeline progress (0 → 1).

   Because nothing here integrates velocity or accumulates state,
   scrolling backwards replays the film exactly in reverse and the
   scene can never drift, stick, or desync. That is the single most
   important architectural decision in this project.
   ============================================================ */

/* ---- World constants ---- */
export const BALL_RADIUS = 0.12;
export const TEE_HEIGHT = 0.1;
/** Ball centre while it is still sitting on the tee. */
export const TEE_BALL_Y = TEE_HEIGHT + BALL_RADIUS;
/** Where the hole lives, far down the hole corridor. */
export const CUP = new THREE.Vector3(-1.15, 0, -303);
export const CUP_RADIUS = 0.16;
/** Centre of the putting green. */
export const GREEN_CENTER = new THREE.Vector3(-0.6, 0, -298);
export const GREEN_RADIUS = 13;

/* ---- Timeline anchors (mirrors BEATS in scrollStore) ---- */
const P_IMPACT = 0.2;
const P_LAUNCH = 0.207;
const P_TOUCHDOWN = 0.93;
const P_SETTLED = 0.977;
const P_HOLED = 0.999;

/* ------------------------------------------------------------
   Keyframe sampling
   ------------------------------------------------------------ */

type ScalarKey = [at: number, value: number];
type VectorKey = [at: number, x: number, y: number, z: number];

/** Smooth (C1-continuous) interpolation across an ordered key list. */
function sampleScalar(keys: ScalarKey[], p: number): number {
  if (p <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (p >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const t = smootherstep(a[0], b[0], p);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return last[1];
}

function sampleVector(keys: VectorKey[], p: number, out: THREE.Vector3): THREE.Vector3 {
  if (p <= keys[0][0]) return out.set(keys[0][1], keys[0][2], keys[0][3]);
  const last = keys[keys.length - 1];
  if (p >= last[0]) return out.set(last[1], last[2], last[3]);
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p >= a[0] && p <= b[0]) {
      const t = smootherstep(a[0], b[0], p);
      return out.set(
        a[1] + (b[1] - a[1]) * t,
        a[2] + (b[2] - a[2]) * t,
        a[3] + (b[3] - a[3]) * t,
      );
    }
  }
  return out.set(last[1], last[2], last[3]);
}

/* ------------------------------------------------------------
   THE FLIGHT PATH

   A Catmull-Rom curve through hand-placed waypoints, so the arc is
   art-directed rather than left to a physics solver — cinematic
   believability beats simulation accuracy here.
   ------------------------------------------------------------ */
export const FLIGHT_CURVE = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, TEE_BALL_Y, 0),
    new THREE.Vector3(0.18, 3.1, -14),
    new THREE.Vector3(0.62, 8.4, -46),
    new THREE.Vector3(1.15, 13.6, -96),
    new THREE.Vector3(1.32, 15.4, -150),
    new THREE.Vector3(0.82, 13.2, -203),
    new THREE.Vector3(-0.1, 8.0, -247),
    new THREE.Vector3(-0.86, 2.9, -276),
    new THREE.Vector3(-1.12, BALL_RADIUS, -288.5),
  ],
  false,
  'catmullrom',
  0.4,
);

/**
 * Progress → position along the flight curve.
 *
 * The mapping is deliberately non-linear. The ball explodes off the
 * face, climbs, then all but HANGS at altitude while the collection
 * and product chapters play out — time stretches for the editorial
 * act — before gravity takes over into the descent.
 */
const FLIGHT_T: ScalarKey[] = [
  [P_LAUNCH, 0.0],
  [0.235, 0.055], // violent acceleration off the clubface
  [0.3, 0.18],
  [0.38, 0.31],
  [0.44, 0.4], // climbing out
  [0.52, 0.47],
  [0.58, 0.505], // apex — the course opens up
  [0.7, 0.53], // suspended: the editorial act
  [0.8, 0.565],
  [0.86, 0.63], // gravity resumes
  [0.9, 0.78],
  [P_TOUCHDOWN, 1.0], // touchdown
];

const _flightPos = new THREE.Vector3();

/** Landing, two bounces, roll, and the drop into the cup. */
function sampleGroundPhase(p: number, out: THREE.Vector3): THREE.Vector3 {
  const land = FLIGHT_CURVE.getPoint(1);

  // --- Bounce 1 ---
  if (p < 0.945) {
    const t = mapRange(p, P_TOUCHDOWN, 0.945);
    const z = THREE.MathUtils.lerp(land.z, -294.2, t);
    const x = THREE.MathUtils.lerp(land.x, -1.14, t);
    const y = BALL_RADIUS + Math.sin(t * Math.PI) * 1.15;
    return out.set(x, y, z);
  }

  // --- Bounce 2, much smaller ---
  if (p < 0.958) {
    const t = mapRange(p, 0.945, 0.958);
    const z = THREE.MathUtils.lerp(-294.2, -298.4, t);
    const x = THREE.MathUtils.lerp(-1.14, -1.15, t);
    const y = BALL_RADIUS + Math.sin(t * Math.PI) * 0.3;
    return out.set(x, y, z);
  }

  // --- The roll: decelerating across the green toward the cup ---
  if (p < P_SETTLED) {
    const t = easeOutCubic(mapRange(p, 0.958, P_SETTLED));
    return out.set(
      THREE.MathUtils.lerp(-1.15, CUP.x, t),
      BALL_RADIUS,
      THREE.MathUtils.lerp(-298.4, CUP.z - CUP_RADIUS * 0.35, t),
    );
  }

  // --- The last inches, then it drops ---
  const t = mapRange(p, P_SETTLED, P_HOLED);
  const lip = smoothstep(0.35, 1, t);
  return out.set(
    CUP.x,
    BALL_RADIUS - lip * (BALL_RADIUS + 0.55),
    THREE.MathUtils.lerp(CUP.z - CUP_RADIUS * 0.35, CUP.z, smoothstep(0, 0.6, t)),
  );
}

export function ballPosition(p: number, out = _flightPos): THREE.Vector3 {
  // At rest on the tee.
  if (p <= P_LAUNCH) return out.set(0, TEE_BALL_Y, 0);
  // On the ground: bounce, roll, hole out.
  if (p >= P_TOUCHDOWN) return sampleGroundPhase(p, out);
  // In the air.
  const t = clamp(sampleScalar(FLIGHT_T, p));
  return out.copy(FLIGHT_CURVE.getPoint(t));
}

/**
 * Backspin. Accumulated from the path parameter (not from elapsed time)
 * so the spin unwinds correctly when scrolling back up.
 */
export function ballSpin(p: number): number {
  if (p <= P_LAUNCH) return 0;
  if (p >= P_TOUCHDOWN) {
    const roll = mapRange(p, P_TOUCHDOWN, P_SETTLED);
    return 96 + easeOutCubic(roll) * 15;
  }
  return clamp(sampleScalar(FLIGHT_T, p)) * 96;
}

/* ------------------------------------------------------------
   THE CAMERA

   The camera is always expressed as an OFFSET FROM THE BALL. The ball
   is the main character, so the lens is literally rigged to it — it
   can never lose its subject, at any scroll position, on any screen.
   ------------------------------------------------------------ */

const CAM_OFFSET: VectorKey[] = [
  [0.0, 0.92, 0.27, 2.35], // first tee: low, close, generous negative space
  [0.08, 0.68, 0.2, 1.9], // the camera begins to move in
  [0.155, 0.6, 0.34, 2.45], // tension
  [P_IMPACT, 0.56, 0.31, 2.2], // impact — the ball holds the frame
  /*
    The chase used to fall back far enough that the ball became a
    twenty-pixel speck on a phone. These are pulled in by roughly a
    third: the course still opens up underneath, but the ball stays the
    thing the shot is about.
  */
  /*
    Distances through the chase are kept between three and five units.

    Any further back and the ball is a twenty-pixel speck on a phone, and
    the shot stops being about it. The sense of height and scale comes
    instead from pitching the lens DOWN (see LOOK_OFFSET) so the fairway,
    its bunkering and the tree lines open up beneath the ball, rather
    than from retreating until the ball is lost.
  */
  [0.235, 0.95, 0.62, 3.0], // it's gone; the lens is left behind
  [0.3, 1.05, 0.8, 3.7], // giving chase
  [0.4, 1.2, 1.15, 4.3],
  [0.47, 1.3, 1.3, 4.5], // the apex: the course opens up below
  [0.56, 1.2, 0.95, 3.9], // closing back in
  [0.63, 1.25, 0.45, 3.1], // the environment turns editorial
  [0.7, 0.42, 0.12, 0.92], // hero: the ball fills the frame
  [0.76, 0.36, 0.1, 0.78],
  [0.82, 0.8, 0.3, 2.0], // drifting off
  [0.88, 2.9, 2.0, 10.5], // pulling back for the descent
  [P_TOUCHDOWN, 2.3, 0.95, 7.0], // watching it land
  [0.958, 1.25, 0.45, 3.4], // down to the roll
  [P_SETTLED, 0.85, 0.36, 2.0],
  [1.0, 0.85, 0.46, 1.95], // over the cup
];

/** A slight lead on the look-at target keeps the framing alive. */
const LOOK_OFFSET: VectorKey[] = [
  // Looking above the ball drops it into the lower third and leaves the
  // sky clear for the lockup.
  [0.0, -0.34, 0.44, -0.7],
  [0.1, -0.2, 0.2, -0.45],
  [P_IMPACT, -0.02, 0.12, -0.3],
  // Pitched down through the flight, so the land beneath the ball is the
  // thing that conveys height. The ball sits high in frame and the hole
  // runs away below it.
  [0.3, -0.3, -0.35, -4.2], // looking ahead down the line of flight
  [0.47, -0.5, -0.6, -9.0], // the widest read of the course
  [0.56, -0.3, -0.4, -4.0],
  // Through the apparel chapters the ball is cropped by the bottom of
  // frame — a large sculptural presence that never competes with the
  // garment or the type.
  [0.63, 0.04, 0.2, -0.45],
  [0.7, 0.03, 0.29, -0.16],
  [0.79, 0.03, 0.27, -0.16],
  [0.85, 0.02, 0.24, -0.35],
  [0.88, -0.4, -0.5, -4.0], // anticipating the green
  [P_TOUCHDOWN, -0.2, -0.2, -2.2],
  // Look well above the cup so it sits low in frame and the closing
  // headline has clean turf behind it.
  [1.0, 0.12, 0.5, -0.5],
];

/** Lens choice is storytelling: long and intimate, then wide and grand. */
const FOV_KEYS: ScalarKey[] = [
  [0.0, 34],
  [P_IMPACT, 32], // compressed, tense
  [0.235, 46], // the whip of the launch
  [0.47, 54], // expansive
  [0.63, 40],
  [0.7, 36], // the product lens
  [0.88, 50],
  [P_TOUCHDOWN, 44],
  [1.0, 38],
];

const _camPos = new THREE.Vector3();
const _camLook = new THREE.Vector3();
const _offset = new THREE.Vector3();

/** A short, decaying jolt through contact. Felt more than seen. */
export function impactShake(p: number): number {
  if (p < P_IMPACT || p > 0.26) return 0;
  const t = mapRange(p, P_IMPACT, 0.26);
  return Math.pow(1 - t, 3.2);
}

export function cameraPosition(p: number, ball: THREE.Vector3, out = _camPos) {
  sampleVector(CAM_OFFSET, p, _offset);
  out.copy(ball).add(_offset);

  // Camera shake at impact — tiny, high-frequency, gone in an instant.
  const shake = impactShake(p);
  if (shake > 0.001) {
    out.x += Math.sin(p * 1900) * 0.05 * shake;
    out.y += Math.cos(p * 2300) * 0.04 * shake;
  }

  // The lens must never punch through the turf, even as the ball
  // disappears into the cup at the very end.
  if (out.y < 0.26) out.y = 0.26;
  return out;
}

export function cameraTarget(p: number, ball: THREE.Vector3, out = _camLook) {
  sampleVector(LOOK_OFFSET, p, _offset);
  return out.copy(ball).add(_offset);
}

export const cameraFov = (p: number) => sampleScalar(FOV_KEYS, p);

/* ------------------------------------------------------------
   THE CLUB

   Only the head and the last of the shaft are ever in frame. A partial
   composition reads as cinematography; a whole golfer reads as a video
   game. It arrives, strikes, and is gone inside a few percent of the
   timeline.
   ------------------------------------------------------------ */
export function clubState(p: number) {
  const visible = p > 0.128 && p < 0.206;
  if (!visible) return { visible, angle: 0, opacity: 0 };

  /*
    A 6-unit arm sweeps the clubhead across the frame in a couple of
    degrees, so an honest constant acceleration would put the club on
    screen for a single frame and no viewer would ever see the strike.

    This is therefore shaped like a slow-motion shot: the head decelerates
    as it drops into frame, holds almost still through the ball, then
    accelerates away. Three segments, hand-timed to the ball's launch.
  */
  let angle: number;
  if (p < 0.185) {
    // Falling into frame from the right, slowing as it arrives.
    angle = THREE.MathUtils.lerp(-0.5, -0.14, easeOutCubic(mapRange(p, 0.128, 0.185)));
  } else if (p < P_LAUNCH) {
    // The readable beat: the head crosses the ball and the ball goes.
    angle = THREE.MathUtils.lerp(-0.14, -0.02, mapRange(p, 0.185, P_LAUNCH));
  } else {
    // Gone.
    angle = THREE.MathUtils.lerp(-0.02, 0.55, easeInCubic(mapRange(p, P_LAUNCH, 0.25)));
  }

  /*
    The club dissolves in the last instant before contact rather than
    planting a modelled head next to the ball. A brand film cuts through
    impact — it does not hold on the equipment — and the turf spray, the
    shake and the ball leaving tell the viewer everything they need.
  */
  const opacity = smoothstep(0.128, 0.154, p) * (1 - smoothstep(0.188, 0.203, p));

  return { visible, angle, opacity };
}

/* ------------------------------------------------------------
   ATMOSPHERE

   The colour of the world is on the same timeline. The course burns
   off its morning haze, dissolves into a cream studio for the apparel
   chapters, then settles back to turf for the green.
   ------------------------------------------------------------ */
const SKY_DAWN = new THREE.Color('#e8d9bd');
const SKY_HIGH = new THREE.Color('#dcdcc4');
// Not a flat cream: the editorial horizon is a shade deeper than the
// zenith, so a white golf ball has something to read against instead of
// vanishing into the background.
const SKY_CREAM = new THREE.Color('#d7cfc0');
const SKY_EVENING = new THREE.Color('#e4d9c2');

const _fog = new THREE.Color();

/** How far the world has dissolved into the cream editorial space. */
export const editorialAmount = (p: number) =>
  smoothstep(0.58, 0.67, p) * (1 - smoothstep(0.81, 0.89, p));

export function atmosphereColor(p: number, out = _fog): THREE.Color {
  // Dawn on the tee → cooler, brighter air at altitude.
  out.copy(SKY_DAWN).lerp(SKY_HIGH, smoothstep(0.2, 0.45, p));
  // Dissolve into the cream studio for the collection.
  out.lerp(SKY_CREAM, editorialAmount(p));
  // Back to warm light over the green.
  out.lerp(SKY_EVENING, smoothstep(0.86, 0.95, p));
  return out;
}

/** Fog thins as we climb, so the course reveals itself from above. */
export function fogDensity(p: number): number {
  /*
    Aerial perspective is doing real work here, not just mood. Morning air
    over a Southern course washes out anything past a hundred metres, and
    that falloff is most of what makes distance read as distance. It also
    happens to dissolve the tree line's silhouette before the eye can
    resolve it into flat cards.
  */
  let base = THREE.MathUtils.lerp(0.0125, 0.0047, smoothstep(0.2, 0.46, p));
  // Evening haze over the green: it settles the closing act and keeps the
  // tree line from crowding the hole.
  base = THREE.MathUtils.lerp(base, 0.0125, smoothstep(0.86, 0.94, p));
  const editorial = editorialAmount(p);
  // In the editorial chapters the haze closes in enough to swallow the
  // course, but the ball is only a metre from the lens, so it stays crisp.
  return THREE.MathUtils.lerp(base, 0.055, editorial);
}
