import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { scrollStore } from '../lib/scrollStore';
import {
  ballPosition,
  cameraPosition,
  cameraTarget,
  cameraFov,
  atmosphereColor,
  fogDensity,
  editorialAmount,
} from './cinematics';
import { GolfBall, Tee, Club, TurfSpray } from './GolfBall';
import { createEnvironmentMap } from './textures';
import Grass from './Grass';
import { Sky3D, Turf, TreeLine, PuttingGreen, SUN_DIR } from './Environment';

/* ============================================================
   RAIGE — Scene

   One camera, rigged to the ball, reading a single scroll value.
   Everything else in the 3D world hangs off that.
   ============================================================ */

function CameraRig() {
  const { camera } = useThree();
  const ball = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const target = useMemo(() => new THREE.Vector3(), []);
  const smoothTarget = useMemo(() => new THREE.Vector3(0, 0.25, -0.5), []);

  /*
    The camera reads the SAME damped timeline the ball does.

    It used to run its own second layer of damping on top, which meant
    that during a fast scroll the lens was looking at where the ball had
    been rather than where it was — on a phone that reads as the ball
    vanishing. The smoothing now lives in one place, the store, so the
    lens and its subject cannot come apart at any scroll speed.
  */
  useFrame((_, delta) => {
    const dp = scrollStore.get();
    /*
      The REAL elapsed time, only capped against a backgrounded tab.

      This used to be clamped to 1/30s. Exponential smoothing is written
      in seconds, so feeding it 33ms when 140ms actually passed makes the
      lens converge four times slower than intended — and the slower the
      device, the further the camera trails its own subject. That is the
      "camera loses the ball" fault, and it is the same mistake the scroll
      store had: time-based easing fed a clamped clock.

      No sub-stepping needed here: `1 - exp(-k*dt)` approaches 1 for large
      dt, so it is unconditionally stable.
    */
    const dt = Math.min(delta, 0.25);

    ballPosition(dp, ball);
    cameraPosition(dp, ball, position);
    cameraTarget(dp, ball, target);

    camera.position.copy(position);
    // Damping the look-at separately keeps the framing from snapping
    // when the offset keyframes change direction.
    smoothTarget.lerp(target, 1 - Math.exp(-14 * dt));
    camera.lookAt(smoothTarget);

    /*
      Development-only read-out of where the shot actually is. Reasoning
      about a camera rig from the code alone is how you end up blaming the
      ball for a sprite that was drawing over it.
    */
    if (import.meta.env.DEV) {
      (window as unknown as { __raigeScene?: unknown }).__raigeScene = {
        t: dp,
        cam: camera.position.toArray().map((v) => +v.toFixed(2)),
        ball: ball.toArray().map((v) => +v.toFixed(2)),
        dist: +camera.position.distanceTo(ball).toFixed(2),
        fov: +(camera as THREE.PerspectiveCamera).fov.toFixed(1),
        // Where the ball actually lands on screen, in pixels.
        screen: (() => {
          const ndc = ball.clone().project(camera);
          const w = window.innerWidth;
          const h = window.innerHeight;
          const px = ((ndc.x + 1) / 2) * w;
          const py = ((1 - ndc.y) / 2) * h;
          const fovRad = ((camera as THREE.PerspectiveCamera).fov * Math.PI) / 180;
          const dist = camera.position.distanceTo(ball);
          const diameter = (0.24 / (2 * dist * Math.tan(fovRad / 2))) * h;
          return { x: Math.round(px), y: Math.round(py), d: Math.round(diameter) };
        })(),
      };
    }

    const perspective = camera as THREE.PerspectiveCamera;
    /*
      Field of view is left alone across aspect ratios on purpose. Three's
      fov is VERTICAL, so a portrait phone already preserves the ball's
      on-screen height exactly; it simply crops the sides, which trims the
      tree line rather than the subject. Compensating here would only make
      the ball smaller on the screen that can least afford it.
    */
    const fov = cameraFov(dp);
    if (Math.abs(perspective.fov - fov) > 0.01) {
      perspective.fov = fov;
      perspective.updateProjectionMatrix();
    }
  });

  return null;
}

/**
 * Installs the generated environment map. Everything with a metalness or
 * a specular response depends on this — without it the club is black and
 * the ball has no highlight at all.
 */
function EnvironmentMap() {
  const { scene, gl } = useThree();

  useEffect(() => {
    const source = createEnvironmentMap();
    const pmrem = new THREE.PMREMGenerator(gl);
    const target = pmrem.fromEquirectangular(source);
    scene.environment = target.texture;
    // A light touch: this is lighting support, not a mirror finish.
    scene.environmentIntensity = 0.55;

    source.dispose();
    pmrem.dispose();
    return () => {
      scene.environment = null;
      target.dispose();
    };
  }, [scene, gl]);

  return null;
}

function Atmosphere({
  fogColor,
  fogDensityRef,
}: {
  fogColor: THREE.Color;
  fogDensityRef: React.MutableRefObject<number>;
}) {
  const { scene } = useThree();
  const key = useRef<THREE.DirectionalLight>(null);
  const fill = useRef<THREE.DirectionalLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);

  const fog = useMemo(() => new THREE.FogExp2(fogColor.getHex(), 0.0115), [fogColor]);

  useFrame(() => {
    const p = scrollStore.get();

    atmosphereColor(p, fogColor);
    const density = fogDensity(p);
    fogDensityRef.current = density;

    fog.color.copy(fogColor);
    fog.density = density;
    if (scene.fog !== fog) scene.fog = fog;
    scene.background = null;

    // Lighting follows the story: a hard backlit dawn on the tee, a soft
    // even studio for the apparel chapters, then warm light on the green.
    const editorial = editorialAmount(p);
    // On the course the sun is the key and everything is rim-lit. In the
    // studio chapters that flips: the sun drops away and the lens-side
    // light becomes the key, so the ball is modelled rather than
    // silhouetted against the cream.
    if (key.current) key.current.intensity = THREE.MathUtils.lerp(2.6, 0.45, editorial);
    if (fill.current) fill.current.intensity = THREE.MathUtils.lerp(1.45, 2.6, editorial);
    if (hemi.current) hemi.current.intensity = THREE.MathUtils.lerp(1.05, 1.15, editorial);
  });

  return (
    <>
      <hemisphereLight ref={hemi} args={['#e7ecd6', '#4a6535', 0.95]} />
      {/* Key: low, warm, and behind the action — everything is rim-lit. */}
      <directionalLight
        ref={key}
        position={[SUN_DIR.x * 60, SUN_DIR.y * 60 + 14, SUN_DIR.z * 60]}
        intensity={2.9}
        color="#ffd79b"
      />
      {/* Fill from above and behind the lens, so the ball never goes to
          silhouette and the dimples always catch an edge of light. */}
      <directionalLight ref={fill} position={[3.5, 5, 6]} intensity={1.45} color="#f2f0e6" />
    </>
  );
}

/*
  The sun's glare lives in the sky shader, where the sun is.

  There was a separate additive sprite here. Because it was transparent it
  rendered after all the opaque geometry, and with depth testing off it
  painted a soft bright disc straight over the fairway — which read, at a
  glance, as a second golf ball floating in the middle of the shot. A
  bloom that competes with the subject is not restraint, so it is gone.
*/

/** Holds the fairway and tree line off-screen once we're over the green. */
function CourseBody({
  fogColor,
  fogDensityRef,
  quality,
}: {
  fogColor: THREE.Color;
  fogDensityRef: React.MutableRefObject<number>;
  quality: number;
}) {
  const trees = useRef<THREE.Group>(null);

  useFrame(() => {
    const p = scrollStore.get();
    // The tree line dissolves well before the cream space is established;
    // low-poly canopies floating in a studio void look like a bug.
    const editorial = editorialAmount(p);
    if (trees.current) trees.current.visible = editorial < 0.35;
  });

  return (
    <>
      <Turf fogColor={fogColor} fogDensityRef={fogDensityRef} />
      <group ref={trees}>
        <TreeLine />
      </group>

      {/*
        Real blades, only where the lens is close enough to resolve them:
        the tee at the open and the green at the close. In between we are
        hundreds of units up and the turf shader carries the ground.
      */}
      <Grass
        center={[0, 0, -0.4]}
        radius={11}
        count={Math.round(52000 * quality)}
        visibleFrom={0}
        visibleTo={0.3}
        fogColor={fogColor}
        fogDensityRef={fogDensityRef}
        sunDir={SUN_DIR}
      />
      {/*
        No blades on the green. A putting surface is cut to about three
        millimetres — at the distance this shot uses, individual blades
        are below a pixel, and scattering them across it just reads as
        grit on the felt. The turf shader carries the green.
      */}

      <PuttingGreen />
    </>
  );
}

export default function Scene({ quality }: { quality: number }) {
  // One shared colour object: the fog, the sky and the turf shader all
  // point at it, so they physically cannot drift out of sync.
  const fogColor = useMemo(() => new THREE.Color('#e8d9bd'), []);
  const fogDensityRef = useRef(0.0115);

  return (
    <>
      <CameraRig />
      <EnvironmentMap />
      <Atmosphere fogColor={fogColor} fogDensityRef={fogDensityRef} />
      <Sky3D fogColor={fogColor} />
      <CourseBody fogColor={fogColor} fogDensityRef={fogDensityRef} quality={quality} />
      <Tee />
      <GolfBall quality={quality} />
      <Club />
      <TurfSpray />
    </>
  );
}

