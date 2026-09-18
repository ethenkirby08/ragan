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
import { createEnvironmentMap, createGlareTexture } from './textures';
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
    const dt = Math.min(delta, 1 / 30);

    ballPosition(dp, ball);
    cameraPosition(dp, ball, position);
    cameraTarget(dp, ball, target);

    camera.position.copy(position);
    // Damping the look-at separately keeps the framing from snapping
    // when the offset keyframes change direction.
    smoothTarget.lerp(target, 1 - Math.exp(-14 * dt));
    camera.lookAt(smoothTarget);

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
      <hemisphereLight ref={hemi} args={['#e8ecdf', '#435c38', 1.05]} />
      {/* Key: low, warm, and behind the action — everything is rim-lit. */}
      <directionalLight
        ref={key}
        position={[SUN_DIR.x * 60, SUN_DIR.y * 60 + 14, SUN_DIR.z * 60]}
        intensity={2.6}
        color="#ffdfae"
      />
      {/* Fill from above and behind the lens, so the ball never goes to
          silhouette and the dimples always catch an edge of light. */}
      <directionalLight ref={fill} position={[3.5, 5, 6]} intensity={1.45} color="#f2f0e6" />
    </>
  );
}

/** Holds the fairway and tree line off-screen once we're over the green. */
/**
 * Sun glare.
 *
 * Parked in the sun's direction and kept facing the lens, fading in as
 * the camera turns toward it. The whole scene is backlit by a low sun, so
 * this is the one effect that genuinely belongs — it is what a real lens
 * does when you point it down a fairway at sunrise.
 */
function SunGlare() {
  const sprite = useRef<THREE.Mesh>(null);
  const { camera } = useThree();
  const glare = useMemo(() => createGlareTexture(), []);
  const forward = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => () => glare.dispose(), [glare]);

  useFrame(() => {
    const mesh = sprite.current;
    if (!mesh) return;

    const editorial = editorialAmount(scrollStore.get());
    mesh.position.copy(camera.position).addScaledVector(SUN_DIR, 140);
    mesh.quaternion.copy(camera.quaternion);

    camera.getWorldDirection(forward);
    const alignment = Math.max(forward.dot(SUN_DIR), 0);
    // Only blooms when the lens is actually pointed near the sun, and
    // retires entirely in the cream studio chapters.
    const strength = Math.pow(alignment, 2.2) * (1 - editorial);
    (mesh.material as THREE.MeshBasicMaterial).opacity = strength * 0.5;
    mesh.visible = strength > 0.01;
  });

  return (
    <mesh ref={sprite} renderOrder={-50} visible={false}>
      <planeGeometry args={[150, 150]} />
      <meshBasicMaterial
        map={glare}
        transparent
        opacity={0}
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        fog={false}
      />
    </mesh>
  );
}

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
      <SunGlare />
      <CourseBody fogColor={fogColor} fogDensityRef={fogDensityRef} quality={quality} />
      <Tee />
      <GolfBall quality={quality} />
      <Club />
      <TurfSpray />
    </>
  );
}

