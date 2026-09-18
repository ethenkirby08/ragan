import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import Scene from './Scene';
import FallbackScene from './FallbackScene';
import FrameSequence from './cinema/FrameSequence';
import { configuredMode, loadManifest, type FrameManifest } from './cinema/mode';
import './canvas.css';

/* ============================================================
   RAIGE — Canvas host

   Everything that can go wrong with WebGL is handled here: no support,
   a lost context, a shader that fails to compile on some driver. In
   every case the visitor gets the CSS course instead of a blank page.
   ============================================================ */

function hasWebGL(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl')),
    );
  } catch {
    return false;
  }
}

class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // Never let a 3D failure take the site down with it.
    console.warn('[RAIGE] 3D scene unavailable, falling back to CSS course.', error);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Chooses the renderer for the hero film.
 *
 * `realtime` is the default and costs nothing to decide. The other modes
 * look for a pre-rendered sequence, and fall back to the realtime scene
 * if there isn't one or it is unusable — the film always plays.
 */
function useCinema() {
  const configured = useMemo(configuredMode, []);
  const [manifest, setManifest] = useState<FrameManifest | null>(null);
  const [resolved, setResolved] = useState(configured === 'realtime');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (configured === 'realtime') return;

    const controller = new AbortController();
    loadManifest(controller.signal).then((found) => {
      if (controller.signal.aborted) return;
      if (!found && configured === 'frames') {
        console.warn(
          '[RAIGE] VITE_CINEMA_MODE=frames but no sequence was found at ' +
            '/cinema/manifest.json. Falling back to the realtime scene. ' +
            'See public/cinema/README.md.',
        );
      }
      setManifest(found);
      setResolved(true);
    });

    return () => controller.abort();
  }, [configured]);

  return {
    resolved,
    useFrames: Boolean(manifest) && !failed,
    manifest,
    onFrameFailure: () => setFailed(true),
  };
}

/**
 * Device-appropriate quality. Phones get the same film with fewer
 * blades of grass — the story is identical, the budget is not.
 */
function useQuality(simplified: boolean) {
  return useMemo(() => {
    if (simplified) return 0.4;
    if (typeof navigator === 'undefined') return 1;
    const cores = navigator.hardwareConcurrency ?? 8;
    if (cores <= 4) return 0.55;
    return 1;
  }, [simplified]);
}

export default function CinematicCanvas({
  simplified = false,
  paused = false,
  disabled = false,
}: {
  /** Mobile / low-power: lighter scene, capped pixel ratio. */
  simplified?: boolean;
  /** The cinematic act has scrolled off screen — stop rendering entirely. */
  paused?: boolean;
  /** Reduced motion or no WebGL: use the CSS course. */
  disabled?: boolean;
}) {
  const quality = useQuality(simplified);
  const supported = useMemo(() => hasWebGL(), []);
  const cinema = useCinema();

  if (disabled || !supported) {
    return (
      <div className="cinematic-canvas">
        <FallbackScene animated={!disabled} />
      </div>
    );
  }

  // Still deciding which renderer to use; the loader is still on screen.
  if (!cinema.resolved) {
    return <div className="cinematic-canvas" />;
  }

  // MODE B — a pre-rendered sequence, scrubbed by the same timeline.
  if (cinema.useFrames && cinema.manifest) {
    return (
      <div className="cinematic-canvas">
        <SceneBoundary fallback={<FallbackScene />}>
          <FrameSequence manifest={cinema.manifest} onFailure={cinema.onFrameFailure} />
        </SceneBoundary>
      </div>
    );
  }

  // MODE A — the realtime scene.
  return (
    <div className="cinematic-canvas">
      <SceneBoundary fallback={<FallbackScene />}>
        <Canvas
          // Pausing the render loop when the film is off screen is the
          // single biggest battery saving on the whole site.
          frameloop={paused ? 'never' : 'always'}
          // Never render at more than 2x — 3x on a modern phone is
          // four times the fragment cost for no visible gain.
          dpr={simplified ? [1, 1.6] : [1, 2]}
          gl={{
            antialias: !simplified,
            powerPreference: 'high-performance',
            alpha: false,
            stencil: false,
            depth: true,
          }}
          camera={{ fov: 34, near: 0.04, far: 900, position: [0.9, 0.42, 2.35] }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
            gl.outputColorSpace = THREE.SRGBColorSpace;
          }}
        >
          <Suspense fallback={null}>
            <Scene quality={quality} />
          </Suspense>
        </Canvas>
      </SceneBoundary>
    </div>
  );
}
