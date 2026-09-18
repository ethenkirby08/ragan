import { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { scrollStore } from '../lib/scrollStore';
import { clamp, mapRange, seeded, smoothstep } from '../lib/motion';
import {
  BALL_RADIUS,
  TEE_HEIGHT,
  ballPosition,
  ballSpin,
  clubState,
} from './cinematics';
import {
  createBallColorMap,
  createDimpleNormalMap,
  createShadowTexture,
} from './textures';

/* ============================================================
   RAIGE — The ball, the tee, and the strike
   ============================================================ */

/* ------------------------------------------------------------
   Golf ball
   ------------------------------------------------------------ */
export function GolfBall({ quality }: { quality: number }) {
  const ball = useRef<THREE.Mesh>(null);
  const blur = useRef<THREE.Group>(null);
  const shadow = useRef<THREE.Mesh>(null);

  const colorMap = useMemo(() => createBallColorMap(), []);
  const normalMap = useMemo(() => createDimpleNormalMap(), []);
  const shadowMap = useMemo(() => createShadowTexture(), []);

  // Canvas textures hold GPU memory; release it when the scene unmounts.
  useEffect(
    () => () => {
      colorMap.dispose();
      normalMap.dispose();
      shadowMap.dispose();
    },
    [colorMap, normalMap, shadowMap],
  );

  const segments = quality > 0.75 ? 64 : 40;
  const pos = useMemo(() => new THREE.Vector3(), []);
  const ahead = useMemo(() => new THREE.Vector3(), []);
  const travel = useMemo(() => new THREE.Vector3(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const stretch = useRef(0);

  useFrame((_, delta) => {
    const p = scrollStore.get();
    ballPosition(p, pos);

    if (blur.current) blur.current.position.copy(pos);

    if (ball.current) {
      // Backspin about the axis perpendicular to the line of flight,
      // plus a slow drift so the brand stamp comes around in the air.
      const spin = ballSpin(p);
      ball.current.rotation.set(-spin, spin * 0.06, 0.12);
    }

    /*
      Motion blur, from the ball's own travel rather than from a guess.

      The path is sampled a hair ahead of where we are to get the
      direction of travel, and that is multiplied by how fast the
      TIMELINE is moving to get world units per second. The ball is then
      stretched along exactly that vector. It reads as speed at impact
      and through the flight, and vanishes to nothing on the tee and on
      the green, because there the ball genuinely is not moving.
    */
    if (blur.current) {
      const dt = Math.min(Math.max(delta, 1 / 240), 1 / 24);
      ballPosition(Math.min(p + 0.001, 1), ahead);
      travel.copy(ahead).sub(pos);

      const perProgress = travel.length() / 0.001;
      const speed = perProgress * Math.abs(scrollStore.getVelocity());
      const wanted = clamp(speed / 420, 0, 0.85);

      // Eased so the stretch grows and releases smoothly rather than
      // flickering frame to frame.
      stretch.current += (wanted - stretch.current) * (1 - Math.exp(-9 * dt));

      if (stretch.current > 0.004 && travel.lengthSq() > 1e-10) {
        travel.normalize();
        blur.current.quaternion.setFromUnitVectors(up, travel);
        blur.current.scale.set(1, 1 + stretch.current, 1);
      } else {
        blur.current.quaternion.identity();
        blur.current.scale.setScalar(1);
      }
    }

    if (import.meta.env.DEV && blur.current && ball.current) {
      const ws = new THREE.Vector3();
      blur.current.getWorldScale(ws);
      (window as unknown as { __raigeBall?: unknown }).__raigeBall = {
        groupScale: blur.current.scale.toArray().map((v) => +v.toFixed(3)),
        worldScale: ws.toArray().map((v) => +v.toFixed(3)),
        meshScale: ball.current.scale.toArray().map((v) => +v.toFixed(3)),
        stretch: +stretch.current.toFixed(3),
        pos: blur.current.position.toArray().map((v) => +v.toFixed(2)),
        visible: blur.current.visible,
      };
    }

    if (shadow.current) {
      const height = Math.max(pos.y - BALL_RADIUS, 0);
      // A shadow spreads AND thins as its caster rises; only widening it
      // leaves a dark blot under a ball that is metres in the air.
      const spread = 1 + height * 0.7;
      const fade = Math.pow(clamp(1 - height / 1.4), 1.6) * 0.62;
      shadow.current.position.set(pos.x, 0.006, pos.z);
      shadow.current.scale.setScalar(BALL_RADIUS * 7 * spread);
      (shadow.current.material as THREE.MeshBasicMaterial).opacity = fade;
      shadow.current.visible = fade > 0.01;
    }
  });

  return (
    <>
      {/* The blur group carries position and the speed stretch; the ball
          spins inside it, so spin and stretch never fight each other. */}
      <group ref={blur}>
        <mesh ref={ball} castShadow={false}>
          <sphereGeometry args={[BALL_RADIUS, segments, segments / 2]} />
          <meshStandardMaterial
            map={colorMap}
            normalMap={normalMap}
            normalScale={new THREE.Vector2(1.15, 1.15)}
            roughness={0.28}
            metalness={0}
          />
        </mesh>
      </group>

      {/* Contact shadow */}
      <mesh ref={shadow} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          map={shadowMap}
          transparent
          opacity={0.8}
          depthWrite={false}
          fog={false}
        />
      </mesh>
    </>
  );
}

/* ------------------------------------------------------------
   Tee — a small detail, but the scene has no story without it
   ------------------------------------------------------------ */
export function Tee() {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = scrollStore.get();
    if (!group.current) return;
    // Once the ball is gone the tee has no reason to be on screen.
    group.current.visible = p < 0.26;
    const material = (group.current.children[0] as THREE.Mesh)
      ?.material as THREE.MeshStandardMaterial;
    if (material) {
      material.opacity = 1 - smoothstep(0.21, 0.25, p);
      material.transparent = material.opacity < 0.999;
    }
  });

  return (
    <group ref={group}>
      <mesh position={[0, TEE_HEIGHT * 0.5, 0]}>
        <cylinderGeometry args={[0.022, 0.007, TEE_HEIGHT, 12]} />
        <meshStandardMaterial color="#efe7d6" roughness={0.75} />
      </mesh>
    </group>
  );
}

/* ------------------------------------------------------------
   The club

   Rigged from a pivot far above frame so the head travels a true arc.
   We only ever see the head and the last of the shaft — a partial
   composition reads as cinematography, a whole golfer reads as a game.
   ------------------------------------------------------------ */
/*
  The pivot sits almost directly ABOVE the ball, as a golfer's hands do at
  impact. It has to: the lowest point of the arc is at `pivot.y - length`,
  so a pivot set off to one side swings the clubhead underground on its way
  through and the strike is never seen at all.
*/
const PIVOT = new THREE.Vector3(0.55, 6.2, 0.06);
const CLUB_LENGTH = PIVOT.distanceTo(new THREE.Vector3(0, TEE_HEIGHT * 0.6, 0));
/** How much of the shaft is actually built. */
const SHAFT_VISIBLE = 0.62;
/** Near-black, so the club reads as a shape rather than as an object. */
const CLUB_INK = '#1b2a1c';
/** Rotation that puts the clubhead exactly on the ball at angle 0. */
const BASE_ANGLE = (() => {
  const dir = new THREE.Vector3(0, TEE_HEIGHT * 0.6, 0).sub(PIVOT).normalize();
  return Math.asin(THREE.MathUtils.clamp(dir.x, -1, 1));
})();

export function Club() {
  const rig = useRef<THREE.Group>(null);
  const materials = useRef<THREE.Material[]>([]);

  useFrame(() => {
    const p = scrollStore.get();
    const { visible, angle, opacity } = clubState(p);

    if (rig.current) {
      rig.current.visible = visible;
      rig.current.rotation.z = BASE_ANGLE - angle;
    }

    for (const material of materials.current) {
      material.opacity = opacity;
      material.transparent = opacity < 0.999;
    }

  });

  const register = (material: THREE.Material | null) => {
    if (material && !materials.current.includes(material)) {
      materials.current.push(material);
    }
  };

  return (
    <>
      {/* A slight tilt gives the swing a believable plane. */}
      <group rotation={[0.07, -0.13, 0]}>
        <group ref={rig} position={PIVOT.toArray()} visible={false}>
          {/*
            The club is rendered as a flat SILHOUETTE, not a shaded object.

            The scene is lit by a low sun straight down the fairway, so
            anything between the lens and that sun is genuinely a
            silhouette — and a pure dark shape reads instantly as a golf
            club, where a shaded ellipsoid reads as a stone. It is also
            the restrained choice: no chrome, no gloss, no product shot of
            equipment we do not sell.
          */}
          <mesh position={[0, -CLUB_LENGTH + 0.3 + SHAFT_VISIBLE * 0.5, 0]}>
            <cylinderGeometry args={[0.016, 0.013, SHAFT_VISIBLE, 8]} />
            <meshBasicMaterial ref={register} color={CLUB_INK} transparent opacity={0} />
          </mesh>

          {/* Head. Lifted by its own half-height, because the arc ends
              where the SOLE meets the turf, not at the head's centre. */}
          <group position={[-0.17, -CLUB_LENGTH + 0.11, 0]} rotation={[0, 0, 0.12]}>
            {/* Sized for portrait. A head that reads as a restrained shape
                on a wide desktop frame becomes a black slab across a
                phone, because the crop takes the width away, not the
                height. */}
            <mesh scale={[0.185, 0.098, 0.215]}>
              <sphereGeometry args={[1, 20, 12]} />
              <meshBasicMaterial ref={register} color={CLUB_INK} transparent opacity={0} />
            </mesh>
            {/* Hosel: the short taper from crown to shaft */}
            <mesh position={[0.14, 0.11, 0]} rotation={[0, 0, 0.2]}>
              <cylinderGeometry args={[0.014, 0.028, 0.2, 8]} />
              <meshBasicMaterial ref={register} color={CLUB_INK} transparent opacity={0} />
            </mesh>
          </group>
        </group>
      </group>
    </>
  );
}

/* ------------------------------------------------------------
   Turf spray

   A handful of divot fragments thrown forward at contact. Positions
   are a pure function of scroll, so the burst rewinds cleanly.
   ------------------------------------------------------------ */
const SPRAY_COUNT = 44;
const SPRAY_START = 0.2;
const SPRAY_END = 0.248;

export function TurfSpray() {
  const mesh = useRef<THREE.InstancedMesh>(null);

  const seeds = useMemo(() => {
    const rand = seeded(9124);
    return Array.from({ length: SPRAY_COUNT }, () => ({
      dx: (rand() - 0.5) * 1.5,
      dy: 0.4 + rand() * 1.5,
      dz: -(0.5 + rand() * 2.4),
      spin: (rand() - 0.5) * 8,
      scale: 0.012 + rand() * 0.03,
    }));
  }, []);

  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;

    const p = scrollStore.get();
    if (p < SPRAY_START || p > SPRAY_END) {
      m.visible = false;
      return;
    }
    m.visible = true;

    const t = mapRange(p, SPRAY_START, SPRAY_END);
    const fade = 1 - t;

    for (let i = 0; i < SPRAY_COUNT; i++) {
      const s = seeds[i];
      // Ballistic: constant horizontal, gravity on the vertical.
      const x = s.dx * t * 1.1;
      const y = Math.max(s.dy * t - 4.2 * t * t, 0.002);
      const z = s.dz * t * 1.1;
      dummy.position.set(x, y, z);
      dummy.rotation.set(s.spin * t, s.spin * t * 0.6, 0);
      dummy.scale.setScalar(s.scale * fade);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh
      ref={mesh}
      args={[undefined, undefined, SPRAY_COUNT]}
      visible={false}
      frustumCulled={false}
    >
      <tetrahedronGeometry args={[1, 0]} />
      <meshStandardMaterial color="#35502c" roughness={1} flatShading />
    </instancedMesh>
  );
}
