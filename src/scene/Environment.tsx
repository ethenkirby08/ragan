import { useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { seeded } from '../lib/motion';
import { createFoliageTexture } from './textures';
import { TERRAIN_GLSL, terrainHeight } from './terrain';
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

    /*
      The gradient holds flat at the horizon colour for a band just above
      the horizon before climbing to the zenith. The ground fogs out to
      exactly that colour, so the two meet with nothing to see. Ramping
      from below the horizon instead leaves a faint step right along the
      skyline, which the eye picks out immediately.
    */
    float h = smoothstep(0.035, 0.78, d.y);
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
  ${TERRAIN_GLSL}

  varying vec3 vWorld;
  varying vec3 vNormal;
  varying float vDepth;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);

    float h = raigeGround(world.xz);
    world.y += h;

    // Slope, by finite difference on the same height field. Without a
    // normal the rolling land displaces but never catches the light, and
    // the whole point of the relief is the way a low sun rakes across it.
    const float e = 2.5;
    float hx = raigeGround(world.xz + vec2(e, 0.0));
    float hz = raigeGround(world.xz + vec2(0.0, e));
    vNormal = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));

    vWorld = world.xyz;
    vec4 mv = viewMatrix * world;
    vDepth = -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;

const groundFrag = /* glsl */ `
  ${TERRAIN_GLSL}

  uniform vec3 uFairway;
  uniform vec3 uSemi;
  uniform vec3 uRough;
  uniform vec3 uSand;
  uniform vec3 uFogColor;
  uniform float uFogDensity;
  uniform float uEditorial;
  uniform vec3 uSunDir;

  varying vec3 vWorld;
  varying vec3 vNormal;
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

  /** Elliptical falloff for one bunker. 1 inside, 0 outside. */
  float bunker(vec2 p, vec4 b) {
    vec2 d = (p - b.xy) / b.zw;
    return 1.0 - smoothstep(0.82, 1.0, length(d));
  }

  void main() {
    // Mown corridor, with an edge that wanders the way a real cut does.
    float edge = noise(vec2(vWorld.z * 0.03, 0.0)) * 9.0;
    float lateral = raigeLateral(vWorld.xz);

    // Three zones out from the line of play: fairway, first cut, and the
    // tawny fescue rough that gives a heathland course its colour.
    float toSemi = smoothstep(13.0 + edge, 22.0 + edge, lateral);
    // The tawny band sits between the first cut and the tree line, which
    // is the only place it is ever actually seen down the hole.
    float toRough = smoothstep(24.0 + edge, 42.0 + edge * 1.2, lateral);

    vec3 col = mix(uFairway, uSemi, toSemi);
    col = mix(col, uRough, toRough);

    // Mower stripes, only on the mown part, softened and wandering.
    float corridor = 1.0 - toSemi;
    float wander = noise(vWorld.xz * 0.06) * 2.4;
    float stripe = sin(vWorld.z * 0.2 + wander) * 0.5 + 0.5;
    stripe = smoothstep(0.12, 0.88, stripe);
    col *= mix(0.88, 1.14, stripe * corridor);

    // Mottling across five scales, from drainage patches down to grain.
    float n = noise(vWorld.xz * 0.05) * 0.34
            + noise(vWorld.xz * 0.22) * 0.24
            + noise(vWorld.xz * 0.9) * 0.2
            + noise(vWorld.xz * 4.0) * 0.13
            + noise(vWorld.xz * 15.0) * 0.09;
    col *= 0.78 + n * 0.46;

    float grain = noise(vec2(vWorld.x * 22.0, vWorld.z * 3.0));
    col *= 0.95 + grain * 0.1;

    // Bunkers. Shaded rather than dug: at this distance the sand reads as
    // scale and depth, and a depression would not.
    vec4 pits[4];
    pits[0] = vec4(-27.0, -118.0, 10.0, 5.2);
    pits[1] = vec4(23.0, -188.0, 7.5, 4.0);
    pits[2] = vec4(-21.0, -266.0, 8.5, 4.6);
    pits[3] = vec4(17.0, -274.0, 6.0, 3.4);
    for (int i = 0; i < 4; i++) {
      float inPit = bunker(vWorld.xz, pits[i]);
      if (inPit > 0.001) {
        vec3 sand = uSand * (0.9 + noise(vWorld.xz * 1.6) * 0.2);
        // A darker lip where the face is cut into the ground.
        float lip = smoothstep(0.55, 0.95, inPit) * (1.0 - smoothstep(0.95, 1.0, inPit));
        col = mix(col, sand, inPit);
        col *= 1.0 - lip * 0.12;
      }
    }

    vec3 normal = normalize(vNormal);
    vec3 sun = normalize(uSunDir);
    vec3 view = normalize(cameraPosition - vWorld);

    /*
      Raking light. The sun sits just above the horizon, so slopes facing
      it go bright and slopes turned away fall into shade. This is what
      turns the height field from a wobble into landform.
    */
    float lambert = max(dot(normal, sun), 0.0);
    col *= 0.72 + lambert * 0.55;

    /*
      Grass sheen. Turf scatters light forward, so it goes pale and
      silvery looking toward a low sun and stays dark with the sun
      behind. One term, and more photographic than any texture.
    */
    float toSun = max(dot(view, sun), 0.0);
    float grazing = 1.0 - max(view.y, 0.0);
    col += vec3(0.30, 0.31, 0.22) * pow(toSun, 3.5) * pow(grazing, 2.0) * 0.85;

    // Exponential-squared fog, matched by hand to the scene fog so the
    // custom turf shader and the standard materials share one horizon.
    float f = 1.0 - exp(-pow(vDepth * uFogDensity, 2.0));
    col = mix(col, uFogColor, clamp(f, 0.0, 1.0));

    // In the editorial chapters the course dissolves completely.
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
  const mesh = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uFairway: { value: new THREE.Color('#5d8f3a') },
      uSemi: { value: new THREE.Color('#4a7530') },
      // Tawny fescue, as in the reference: a heathland course is not
      // green to the horizon, and that colour break is most of what
      // separates fairway from everything else at distance.
      uRough: { value: new THREE.Color('#9d9054') },
      uSand: { value: new THREE.Color('#cdba92') },
      uFogColor: { value: fogColor },
      uFogDensity: { value: 0.0125 },
      uEditorial: { value: 0 },
      uSunDir: { value: SUN_DIR.clone() },
    }),
    [fogColor],
  );

  useFrame(() => {
    if (!mat.current) return;
    const editorial = editorialAmount(scrollStore.get());
    mat.current.uniforms.uFogDensity.value = fogDensityRef.current;
    mat.current.uniforms.uEditorial.value = editorial;
    // Once the turf has fully dissolved there is nothing left to draw.
    if (mesh.current) mesh.current.visible = editorial < 0.985;
  });

  return (
    <mesh ref={mesh} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -430]}>
      {/*
        Subdivided so the height field has vertices to move. 170 x 240
        puts a vertex roughly every ten units, which resolves the longest
        relief wavelengths with room to spare and costs one draw call.
      */}
      <planeGeometry args={[1700, 2400, 170, 240]} />
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

   Each tree is three quads crossed about its trunk, carrying a generated
   foliage texture with a torn alpha edge. Solid low-poly canopies were
   the single most "video game" thing in the scene: they gave every tree
   the same smooth silhouette and a hard edge against the sky. Crossed
   billboards break that edge up and let the haze through the canopy,
   which is what reads as a real tree line at distance.

   Alpha testing rather than blending keeps them depth-sorted correctly
   with no transparency artefacts, and the whole line is two draw calls.
   ------------------------------------------------------------ */
const TREE_COUNT = 230;
/** Quads per tree. Three gives a full silhouette from any angle. */
const CARDS = 3;

export function TreeLine() {
  const canopy = useRef<THREE.InstancedMesh>(null);
  const trunks = useRef<THREE.InstancedMesh>(null);

  const foliage = useMemo(() => createFoliageTexture(), []);
  useEffect(() => () => foliage.dispose(), [foliage]);

  const trees = useMemo(() => {
    const rand = seeded(20260417);
    const list: { x: number; z: number; y: number; r: number; h: number; tilt: number; lean: number }[] = [];
    for (let i = 0; i < TREE_COUNT; i++) {
      const side = i % 2 === 0 ? 1 : -1;

      /*
        Two bands. The near line frames the hole; a second, further one
        sits well beyond it and is almost entirely dissolved by haze.
        That second layer is what gives the distance a floor — with one
        band the course simply stops at the tree line.
      */
      const far = i >= TREE_COUNT * 0.62;
      const z = far ? -370 - rand() * 330 : -52 - rand() * 310;
      const inset = far
        ? 30 + rand() * 150
        : 44 + rand() * 46 + Math.abs(z) * 0.02;
      const x = side * inset + (rand() - 0.5) * 8;

      list.push({
        x,
        // Trees stand ON the land, not on the plane it used to be.
        y: terrainHeight(x, z),
        z,
        r: (far ? 5.2 + rand() * 4 : 4.2 + rand() * 3.4),
        h: (far ? 8 + rand() * 7 : 6.5 + rand() * 6.5),
        tilt: (rand() - 0.5) * 0.16,
        lean: rand() * Math.PI,
      });
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const dummy = new THREE.Object3D();
    const tint = new THREE.Color();
    const canopyMesh = canopy.current;
    const trunkMesh = trunks.current;
    if (!canopyMesh || !trunkMesh) return;

    const rand = seeded(5512287);

    trees.forEach((t, i) => {
      /*
        Every tree gets its own tint. A stand of hardwoods varies wildly
        in depth and species; one texture at one colour across 150 trees
        is what makes a tree line read as wallpaper.
      */
      const shade = 0.6 + rand() * 0.45;
      const warmth = rand();
      // Green stays dominant in every channel mix — a hardwood in summer
      // is never sand-coloured, however much the light varies.
      tint.setRGB(
        shade * (0.7 + warmth * 0.14),
        shade * (0.92 + warmth * 0.1),
        shade * (0.6 + warmth * 0.1),
      );

      for (let c = 0; c < CARDS; c++) {
        dummy.position.set(t.x, t.y + t.h, t.z);
        dummy.rotation.set(t.tilt, t.lean + (c * Math.PI) / CARDS, t.tilt * 0.5);
        // Canopies are wider than they are tall, like a mature hardwood.
        // Mirroring alternate cards stops one foliage texture from
        // reading as the same tree stamped 150 times.
        const flip = (i + c) % 2 === 0 ? 1 : -1;
        dummy.scale.set(t.r * 2.3 * flip, t.r * 1.85, t.r * 2.3);
        dummy.updateMatrix();
        canopyMesh.setMatrixAt(i * CARDS + c, dummy.matrix);
        canopyMesh.setColorAt(i * CARDS + c, tint);
      }

      dummy.position.set(t.x, t.y + t.h * 0.4, t.z);
      dummy.scale.set(t.r * 0.075, t.h * 0.46, t.r * 0.075);
      dummy.rotation.set(0, 0, t.tilt * 0.5);
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);
    });

    canopyMesh.instanceMatrix.needsUpdate = true;
    if (canopyMesh.instanceColor) canopyMesh.instanceColor.needsUpdate = true;
    trunkMesh.instanceMatrix.needsUpdate = true;
    canopyMesh.computeBoundingSphere();
    trunkMesh.computeBoundingSphere();
  }, [trees]);

  return (
    <group>
      <instancedMesh
        ref={canopy}
        args={[undefined, undefined, TREE_COUNT * CARDS]}
        frustumCulled={false}
      >
        <planeGeometry args={[1, 1]} />
        <meshStandardMaterial
          map={foliage}
          color="#8f9c72"
          transparent={false}
          alphaTest={0.38}
          side={THREE.DoubleSide}
          roughness={1}
          metalness={0}
        />
      </instancedMesh>
      <instancedMesh ref={trunks} args={[undefined, undefined, TREE_COUNT]} frustumCulled={false}>
        <cylinderGeometry args={[0.7, 1.15, 2, 6]} />
        <meshStandardMaterial color="#3a3020" roughness={1} />
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
        <circleGeometry args={[GREEN_RADIUS, 72]} />
        <meshStandardMaterial color="#5e8347" roughness={0.95} />
      </mesh>

      {/*
        Collar. Two wide, low-contrast rings rather than one hard band —
        a real green fades into its surround through a fringe and a
        first cut, and a single dark ring reads as a painted edge.
      */}
      <mesh
        position={[GREEN_CENTER.x, 0.009, GREEN_CENTER.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[GREEN_RADIUS - 0.6, GREEN_RADIUS + 2.2, 64]} />
        <meshStandardMaterial color="#557a41" roughness={1} />
      </mesh>
      <mesh
        position={[GREEN_CENTER.x, 0.006, GREEN_CENTER.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[GREEN_RADIUS + 1.6, GREEN_RADIUS + 5.5, 64]} />
        <meshStandardMaterial color="#4c7038" roughness={1} />
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

