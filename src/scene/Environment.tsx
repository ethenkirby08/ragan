import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { seeded } from '../lib/motion';
import { scrollStore } from '../lib/scrollStore';
import {
  GREEN_CENTER,
  GREEN_RADIUS,
  CUP,
  CUP_RADIUS,
  editorialAmount,
} from './cinematics';

/* ============================================================
   RAIGE — The course

   Every blade of this environment is generated in code. There is no
   photography anywhere in the 3D scene, which means the opening
   sequence can never look like a stock library, loads in kilobytes,
   and stays perfectly on-brand.
   ============================================================ */

/** Sun sits low and down the fairway, so the whole scene is backlit. */
export const SUN_DIR = new THREE.Vector3(0.34, 0.15, -1).normalize();

/* ------------------------------------------------------------
   Sky
   ------------------------------------------------------------ */
const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFrag = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uSunColor;
  uniform vec3 uSunDir;
  uniform float uSunStrength;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = smoothstep(-0.08, 0.62, d.y);
    vec3 col = mix(uHorizon, uZenith, h);

    float aligned = max(dot(d, normalize(uSunDir)), 0.0);
    // Tight disc + broad atmospheric bloom around it.
    col += uSunColor * (pow(aligned, 340.0) * 2.2 + pow(aligned, 7.0) * 0.4) * uSunStrength;

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

function Sky({ fogColor }: { fogColor: THREE.Color }) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      // Points at the SAME colour object the fog and the turf use, so the
      // horizon can never seam. This is the one uniform in the scene that
      // must not own its value.
      uHorizon: { value: fogColor },
      uZenith: { value: new THREE.Color('#9fb4ae') },
      uSunColor: { value: new THREE.Color('#ffe6b8') },
      uSunDir: { value: SUN_DIR.clone() },
      uSunStrength: { value: 1 },
    }),
    [fogColor],
  );

  const deepSky = useMemo(() => new THREE.Color('#8fa8a6'), []);
  const cream = useMemo(() => new THREE.Color('#f5f0e7'), []);

  useFrame(() => {
    const m = mat.current;
    if (!m) return;
    const p = scrollStore.get();
    const editorial = editorialAmount(p);

    // The horizon colour is authored in cinematics.ts; the zenith is
    // derived from it so sky and fog can never disagree.
    const horizon = m.uniforms.uHorizon.value as THREE.Color;
    const zenith = m.uniforms.uZenith.value as THREE.Color;
    zenith.copy(horizon).lerp(deepSky, 0.75 * (1 - editorial));
    zenith.lerp(cream, editorial);
    // In the cream chapters the sun retreats — a clean studio void.
    m.uniforms.uSunStrength.value = 1 - editorial * 0.92;
  });

  return (
    <mesh frustumCulled={false} renderOrder={-100}>
      <sphereGeometry args={[520, 32, 16]} />
      <shaderMaterial
        ref={mat}
        args={[{ uniforms, vertexShader: skyVert, fragmentShader: skyFrag }]}
        side={THREE.BackSide}
        depthWrite={false}
        fog={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------
   Turf

   Mown stripes, a fairway corridor cut through darker rough, and
   value noise for the mottling that stops CG grass looking like felt.
   ------------------------------------------------------------ */
const groundVert = /* glsl */ `
  varying vec3 vWorld;
  varying float vDepth;
  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const groundFrag = /* glsl */ `
  uniform vec3 uFairway;
  uniform vec3 uRough;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uSunFacing;
  uniform float uEditorial;
  varying vec3 vWorld;
  varying float vDepth;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void main() {
    // Fairway corridor: mown turf in the middle, rough at the edges.
    float lateral = abs(vWorld.x + vWorld.z * 0.012);
    float corridor = 1.0 - smoothstep(16.0, 30.0, lateral);
    vec3 col = mix(uRough, uFairway, corridor);

    // Mower stripes, alternating with the direction of cut.
    float stripe = sin(vWorld.z * 0.21) * 0.5 + 0.5;
    stripe = smoothstep(0.3, 0.7, stripe);
    col *= mix(0.84, 1.2, stripe * corridor);

    // Three octaves of mottling. The finest one carries the near-field
    // turf detail that used to be faked with instanced tufts.
    float n = noise(vWorld.xz * 0.09) * 0.45
            + noise(vWorld.xz * 0.9) * 0.33
            + noise(vWorld.xz * 6.5) * 0.22;
    col *= 0.8 + n * 0.4;

    // Long raking light from the low sun.
    col *= 0.94 + uSunFacing * 0.12;

    // Exponential-squared fog, matched by hand to the scene fog so the
    // custom turf shader and the standard materials share one horizon.
    float f = 1.0 - exp(-pow(vDepth * uFogDensity, 2.0));
    col = mix(col, uFogColor, clamp(f, 0.0, 1.0));

    // In the editorial chapters the course dissolves completely, so the
    // ball is left floating in a clean studio rather than hovering over
    // a horizon line that has no business being there.
    col = mix(col, uFogColor, uEditorial);

    gl_FragColor = vec4(col, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Turf({
  fogColor,
  fogDensityRef,
}: {
  fogColor: THREE.Color;
  fogDensityRef: React.MutableRefObject<number>;
}) {
  const mat = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uFairway: { value: new THREE.Color('#517a38') },
      uRough: { value: new THREE.Color('#2f4b28') },
      uFogColor: { value: fogColor },
      uFogDensity: { value: 0.0115 },
      uSunFacing: { value: 0.5 },
      uEditorial: { value: 0 },
    }),
    [fogColor],
  );

  const mesh = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!mat.current) return;
    const editorial = editorialAmount(scrollStore.get());
    mat.current.uniforms.uFogDensity.value = fogDensityRef.current;
    mat.current.uniforms.uEditorial.value = editorial;
    // Once the turf has fully dissolved there is nothing left to draw, and
    // leaving it on puts a flat band under the sky gradient.
    if (mesh.current) mesh.current.visible = editorial < 0.985;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -400]} receiveShadow={false}>
      {/* Deliberately vast: the plane's far edge must never surface
          through the haze at any point on the timeline. */}
      <planeGeometry args={[3000, 3000, 1, 1]} />
      <shaderMaterial
        ref={mat}
        args={[{ uniforms, vertexShader: groundVert, fragmentShader: groundFrag }]}
        fog={false}
      />
    </mesh>
  );
}

/* ------------------------------------------------------------
   Tree line

   Instanced canopies and trunks. Seen through haze at distance they
   read as mature Southern hardwoods; two draw calls for the lot.
   ------------------------------------------------------------ */
const TREE_COUNT = 150;

export function TreeLine() {
  const canopies = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);

  const trees = useMemo(() => {
    const rand = seeded(20260417);
    const list: { x: number; z: number; r: number; h: number; tilt: number }[] = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const z = -52 - rand() * 310;
      // The corridor widens gently down the hole.
      const inset = 44 + rand() * 46 + Math.abs(z) * 0.02;
      list.push({
        x: side * inset + (rand() - 0.5) * 8,
        z,
        r: 3.2 + rand() * 3.2,
        h: 5.5 + rand() * 6,
        tilt: (rand() - 0.5) * 0.25,
      });
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const canopyMesh = canopies.current;
    const trunkMesh = trunks.current;
    if (!canopyMesh || !trunkMesh) return;

    trees.forEach((t, i) => {
      // Main canopy, squashed wider than tall like a mature hardwood.
      dummy.position.set(t.x, t.h, t.z);
      dummy.scale.set(t.r * 1.15, t.r * 0.78, t.r * 1.15);
      dummy.rotation.set(t.tilt, i * 1.7, t.tilt * 0.5);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i * 2, dummy.matrix);

      // A second, smaller mass offset up and to one side breaks the
      // perfect dome into something that reads as foliage.
      dummy.position.set(
        t.x + t.r * (i % 2 === 0 ? 0.45 : -0.45),
        t.h + t.r * 0.42,
        t.z + t.r * 0.25,
      );
      dummy.scale.set(t.r * 0.72, t.r * 0.56, t.r * 0.72);
      dummy.rotation.set(t.tilt * 2, i * 2.3, t.tilt);
      dummy.updateMatrix();
      canopyMesh.setMatrixAt(i * 2 + 1, dummy.matrix);

      dummy.position.set(t.x, t.h * 0.42, t.z);
      dummy.scale.set(t.r * 0.11, t.h * 0.5, t.r * 0.11);
      dummy.rotation.set(0, 0, t.tilt * 0.4);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
    });

    canopyMesh.instanceMatrix.needsUpdate = true;
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.computeBoundingSphere();
    trunkMesh.computeBoundingSphere();
  }, [trees]);

  return (
    <group>
      <instancedMesh ref={canopies} args={[undefined, undefined, TREE_COUNT * 2]} frustumCulled={false}>
        <icosahedronGeometry args={[1, 2]} />
        <meshStandardMaterial color="#20361f" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[0.8, 1.1, 2, 5]} />
        <meshStandardMaterial color="#2a2418" roughness={1} />
      </instancedMesh>
    </group>
  );
}

/* ------------------------------------------------------------
   The green, the cup, and the flagstick
   ------------------------------------------------------------ */
export function PuttingGreen() {
  const group = useRef<THREE.Group>(null);
  const flag = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const p = scrollStore.get();
    // The green is only ever on screen for the closing act.
    if (group.current) group.current.visible = p > 0.8;
    // A breath of wind in the flag — the one idle animation on the site.
    if (flag.current && p > 0.8) {
      const t = state.clock.elapsedTime;
      flag.current.rotation.y = Math.sin(t * 0.9) * 0.16 + 0.1;
      flag.current.scale.x = 1 + Math.sin(t * 1.7) * 0.04;
    }
  });

  return (
    <group ref={group}>
      {/* Closely mown putting surface, fractionally proud of the fairway. */}
      <mesh
        position={[GREEN_CENTER.x, 0.012, GREEN_CENTER.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[GREEN_RADIUS, 64]} />
        <meshStandardMaterial color="#5e8347" roughness={0.95} />
      </mesh>

      {/* Collar of slightly longer grass around the edge. */}
      <mesh
        position={[GREEN_CENTER.x, 0.008, GREEN_CENTER.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[GREEN_RADIUS, GREEN_RADIUS + 2.4, 64]} />
        <meshStandardMaterial color="#496b3a" roughness={1} />
      </mesh>

      {/* The hole. */}
      <group position={[CUP.x, 0, CUP.z]}>
        <mesh position={[0, -0.3, 0]}>
          <cylinderGeometry args={[CUP_RADIUS, CUP_RADIUS, 0.62, 24, 1, true]} />
          <meshStandardMaterial color="#0d1710" side={THREE.BackSide} roughness={1} />
        </mesh>
        <mesh position={[0, -0.61, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[CUP_RADIUS, 24]} />
          <meshStandardMaterial color="#070d08" roughness={1} />
        </mesh>
        {/* The rim reads as a crisp dark ellipse from any angle. */}
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[CUP_RADIUS * 0.94, CUP_RADIUS * 1.12, 24]} />
          <meshStandardMaterial color="#16210f" roughness={1} />
        </mesh>

        {/* Flagstick — the same flag that sits inside the RAIGE monogram. */}
        <mesh position={[0, 1.05, 0]} castShadow={false}>
          <cylinderGeometry args={[0.018, 0.018, 2.1, 8]} />
          <meshStandardMaterial color="#e8e2d4" roughness={0.6} metalness={0.05} />
        </mesh>
        <mesh ref={flag} position={[0.32, 1.82, 0]}>
          <planeGeometry args={[0.62, 0.4, 6, 3]} />
          <meshStandardMaterial
            color="#f5f0e7"
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </group>
  );
}

export function Sky3D({ fogColor }: { fogColor: THREE.Color }) {
  return <Sky fogColor={fogColor} />;
}

