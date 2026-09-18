import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scrollStore } from '../lib/scrollStore';
import { seeded } from '../lib/motion';

/* ============================================================
   RAIGE — Grass

   Individual blades, instanced.

   An earlier pass faked near-field turf with small cones and it read as
   scattered objects sitting on a lawn, never as grass. The difference is
   not density, it is silhouette: real blades are thin, tapered, bent,
   and lit brightest at the tip. So these are actual blades — a curved
   tapered strip, four segments, shaded from a dark base to a pale tip,
   leaning on a slow wind.

   They are only ever built where the camera is genuinely close to the
   ground: around the tee at the open, and around the green at the close.
   Everywhere else the turf shader carries it.
   ============================================================ */

/** A single blade: curved, tapered, four segments. */
function createBladeGeometry() {
  const segments = 4;
  const positions: number[] = [];
  const heights: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    // Taper to a point, with the width holding longer near the base.
    const halfWidth = 0.5 * (1 - Math.pow(t, 1.45));
    // Blades bend away from vertical as they rise.
    const bend = Math.pow(t, 2) * 0.42;
    positions.push(-halfWidth, t, bend, halfWidth, t, bend);
    heights.push(t, t);
  }

  for (let i = 0; i < segments; i++) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aHeight', new THREE.Float32BufferAttribute(heights, 1));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

const vertexShader = /* glsl */ `
  attribute float aHeight;
  attribute float aPhase;
  attribute float aTone;

  uniform float uTime;
  uniform float uWind;

  varying float vHeight;
  varying float vTone;
  varying float vDepth;
  varying vec3 vWorld;

  void main() {
    vHeight = aHeight;
    vTone = aTone;

    vec4 world = instanceMatrix * vec4(position, 1.0);
    world = modelMatrix * world;

    // Wind: only the top of the blade moves, quadratically, with each
    // blade on its own phase so the field never pulses as one.
    float sway = sin(uTime * 1.35 + aPhase) * 0.5 + sin(uTime * 0.53 + aPhase * 1.7) * 0.5;
    float amount = aHeight * aHeight * uWind;
    world.x += sway * amount;
    world.z += sway * amount * 0.45;

    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uBase;
  uniform vec3 uTip;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform vec3 uSunDir;

  varying float vHeight;
  varying float vTone;
  varying float vDepth;
  varying vec3 vWorld;

  void main() {
    // Grass is dark and cool at the base where light does not reach, and
    // pale at the tip where it does.
    vec3 col = mix(uBase, uTip, pow(vHeight, 0.78));
    col *= 0.8 + vTone * 0.36;

    // Blades catch the low sun most strongly near the top.
    vec3 view = normalize(cameraPosition - vWorld);
    float rim = pow(max(dot(view, normalize(uSunDir)), 0.0), 3.0);
    col += uTip * rim * vHeight * 0.3;

    float f = 1.0 - exp(-pow(vDepth * uFogDensity, 2.0));
    col = mix(col, uFogColor, clamp(f, 0.0, 1.0));

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function Grass({
  center,
  radius,
  count,
  visibleFrom,
  visibleTo,
  fogColor,
  fogDensityRef,
  sunDir,
  scale = 1,
}: {
  center: [number, number, number];
  radius: number;
  count: number;
  /** Timeline window in which this patch is worth drawing. */
  visibleFrom: number;
  visibleTo: number;
  fogColor: THREE.Color;
  fogDensityRef: React.MutableRefObject<number>;
  sunDir: THREE.Vector3;
  scale?: number;
}) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const material = useRef<THREE.ShaderMaterial>(null);

  const geometry = useMemo(createBladeGeometry, []);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWind: { value: 0.012 },
      // Matched to the turf shader's fairway tone. Blades lighter than
      // the ground they stand in read as scattered darts, not as grass.
      uBase: { value: new THREE.Color('#25391c') },
      uTip: { value: new THREE.Color('#6f9440') },
      uFogColor: { value: fogColor },
      uFogDensity: { value: 0.0115 },
      uSunDir: { value: sunDir },
    }),
    [fogColor, sunDir],
  );

  useLayoutEffect(() => {
    const instanced = mesh.current;
    if (!instanced) return;

    const rand = seeded(Math.round(Math.abs(center[2]) * 977 + count));
    const dummy = new THREE.Object3D();
    const phase = new Float32Array(count);
    const tone = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      /*
        Density is concentrated toward the middle rather than spread
        evenly. The camera stands at the centre of this patch, so that is
        where blades have to be thick enough to close up into turf; out at
        the rim they thin out and hand over to the ground shader, which
        hides the edge of the field far better than a hard boundary.
      */
      const angle = rand() * Math.PI * 2;
      const r = Math.pow(rand(), 0.75) * radius;

      /*
        Blades shorten toward the rim until they are flush with the
        ground. Without this the patch ends on a hard circle and you can
        see exactly where the grass stops and the shader takes over —
        the one thing that gave the whole trick away.
      */
      const rim = Math.min(r / radius, 1);
      const fade = 1 - Math.pow(Math.max((rim - 0.45) / 0.55, 0), 1.6);

      // Real turf is never one length. A few blades stand proud.
      const tall = rand() > 0.94 ? 1.5 : 1;
      /*
        Clamped, never skipped. Leaving an instance's matrix unset leaves
        it as all zeros, which sends every vertex through the projection
        with w = 0 and paints a huge garbage triangle across the frame.
        A near-zero scale collapses the blade to a point instead, which
        is what "not there" is supposed to look like.
      */
      const height = Math.max((0.026 + rand() * 0.03) * tall * fade * scale, 0.0006);
      const width = (0.009 + rand() * 0.0055) * scale;

      dummy.position.set(center[0] + Math.cos(angle) * r, 0, center[2] + Math.sin(angle) * r);
      dummy.rotation.set((rand() - 0.5) * 0.3, rand() * Math.PI * 2, (rand() - 0.5) * 0.34);
      dummy.scale.set(width, height, width);
      dummy.updateMatrix();
      instanced.setMatrixAt(i, dummy.matrix);

      phase[i] = rand() * Math.PI * 2;
      tone[i] = rand();
    }

    instanced.instanceMatrix.needsUpdate = true;
    instanced.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phase, 1));
    instanced.geometry.setAttribute('aTone', new THREE.InstancedBufferAttribute(tone, 1));
    instanced.computeBoundingSphere();
  }, [center, count, radius, scale, geometry]);

  useFrame((state) => {
    const p = scrollStore.get();
    const instanced = mesh.current;
    if (!instanced) return;

    // Building 25,000 blades is cheap; drawing them when the camera is
    // 200 units up in the air is not.
    const shown = p >= visibleFrom && p <= visibleTo;
    instanced.visible = shown;
    if (!shown || !material.current) return;

    material.current.uniforms.uTime.value = state.clock.elapsedTime;
    material.current.uniforms.uFogDensity.value = fogDensityRef.current;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, count]}
      frustumCulled={false}
      visible={false}
    >
      <shaderMaterial
        ref={material}
        args={[{ uniforms, vertexShader, fragmentShader }]}
        side={THREE.DoubleSide}
        fog={false}
      />
    </instancedMesh>
  );
}
