/* ============================================================
   RAIGE — Terrain

   The course used to be a flat plane. Flat ground is the single biggest
   reason a 3D landscape reads as a diagram rather than a photograph:
   without rolling land there is no horizon that moves, no fairway that
   falls away, and nothing for the light to rake across.

   This is the height field, defined once and used in three places:

     - the turf's vertex shader, to displace the ground
     - JavaScript, to sit trees and props on the ground
     - the fairway's shading, which reads the slope

   The GLSL and the TypeScript below are the same function written twice.
   They must stay identical, so both are built only from sines — no
   noise texture, no hash function, nothing that could drift between the
   two implementations.
   ============================================================ */

/** Flat radius around the tee, in world units. */
export const TEE_FLAT = [14, 46] as const;
/** Flat radius around the green complex. */
export const GREEN_FLAT = [20, 62] as const;
export const GREEN_AT = [-0.6, -298] as const;

/**
 * Bunkers, as [x, z, radiusX, radiusZ].
 *
 * They are shaded rather than excavated. At the distance the film sees
 * them a depression would not read, and keeping them out of the height
 * field keeps the ball's landing maths simple.
 */
export const BUNKERS: [number, number, number, number][] = [
  [-27, -118, 10, 5.2],
  [23, -188, 7.5, 4],
  [-21, -266, 8.5, 4.6],
  [17, -274, 6, 3.4],
];

/* ------------------------------------------------------------
   GLSL — injected into the turf and grass shaders
   ------------------------------------------------------------ */
export const TERRAIN_GLSL = /* glsl */ `
  /*
    Rolling land. Long wavelengths first, so the shape reads at distance.

    The amplitudes look small for a golf course, and they are — this
    world is compressed. The ball's whole flight tops out around 15 units
    and the chase camera flies at four to sixteen. Relief scaled to a real
    hole would put hills at lens height, which grazes the ground across
    the entire frame and swallows the horizon.
  */
  float raigeRelief(vec2 p) {
    float h = 0.0;
    h += sin(p.y * 0.0062 - 1.2) * 1.40;
    h += sin(p.y * 0.0151 + 0.6) * 0.65;
    h += sin(p.x * 0.0104 + p.y * 0.0033 + 1.7) * 0.50;
    h += sin(p.y * 0.0298 + p.x * 0.0072) * 0.28;
    h += sin(p.x * 0.0241 - 0.4) * 0.20;
    return h;
  }

  // How far a point sits from the line of play.
  float raigeLateral(vec2 p) {
    return abs(p.x + p.y * 0.012);
  }

  // The tee and the green are graded flat, as they are on a real course —
  // and, less romantically, because the ball's rest, bounce and roll all
  // assume ground level there.
  float raigeFlatten(vec2 p) {
    float tee = smoothstep(${TEE_FLAT[0]}.0, ${TEE_FLAT[1]}.0, length(p));
    float green = smoothstep(
      ${GREEN_FLAT[0]}.0, ${GREEN_FLAT[1]}.0,
      length(p - vec2(${GREEN_AT[0]}, ${GREEN_AT[1]}.0))
    );
    return min(tee, green);
  }

  float raigeGround(vec2 p) {
    /*
      The corridor the camera actually flies down is graded nearly flat,
      and the land is allowed to roll only out in the rough where the
      lens never goes. That keeps a moving horizon and real landform in
      the distance without ever lifting ground into the shot.
    */
    float relief = mix(0.25, 1.0, smoothstep(12.0, 70.0, raigeLateral(p)));
    return raigeRelief(p) * relief * raigeFlatten(p);
  }
`;

/* ------------------------------------------------------------
   TypeScript — the same function, for placing things on the ground
   ------------------------------------------------------------ */

const smoothstep = (edge0: number, edge1: number, v: number) => {
  const t = Math.min(Math.max((v - edge0) / (edge1 - edge0 || 1), 0), 1);
  return t * t * (3 - 2 * t);
};

function relief(x: number, z: number) {
  let h = 0;
  h += Math.sin(z * 0.0062 - 1.2) * 1.4;
  h += Math.sin(z * 0.0151 + 0.6) * 0.65;
  h += Math.sin(x * 0.0104 + z * 0.0033 + 1.7) * 0.5;
  h += Math.sin(z * 0.0298 + x * 0.0072) * 0.28;
  h += Math.sin(x * 0.0241 - 0.4) * 0.2;
  return h;
}

export const lateralFromPlay = (x: number, z: number) => Math.abs(x + z * 0.012);

function flatten(x: number, z: number) {
  const tee = smoothstep(TEE_FLAT[0], TEE_FLAT[1], Math.hypot(x, z));
  const green = smoothstep(
    GREEN_FLAT[0],
    GREEN_FLAT[1],
    Math.hypot(x - GREEN_AT[0], z - GREEN_AT[1]),
  );
  return Math.min(tee, green);
}

/** Ground height at a world position. Matches `raigeGround` in GLSL. */
export function terrainHeight(x: number, z: number): number {
  const smoothing = 0.25 + (1 - 0.25) * smoothstep(12, 70, lateralFromPlay(x, z));
  return relief(x, z) * smoothing * flatten(x, z);
}
