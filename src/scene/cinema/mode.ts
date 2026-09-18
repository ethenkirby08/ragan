/* ============================================================
   RAIGE — Cinema mode

   The hero film has two interchangeable renderers:

     MODE A  realtime   — the Three.js scene in src/scene
     MODE B  frames     — a pre-rendered image sequence, scrubbed

   Both are driven by exactly the same thing: the damped timeline in
   src/lib/scrollStore.ts. The chapters, the beats, the typography and
   the scroll behaviour know nothing about which one is running, so the
   two can be swapped without touching the rest of the site.

   Why the seam exists at all: real-time WebGL has a ceiling, and that
   ceiling is well short of "someone filmed this". Path-traced grass,
   true depth of field, real subsurface light through a leaf and genuine
   motion blur are offline-render features. The route to a photographic
   hero is to render it offline — in Blender or from footage — and let
   scroll scrub the result. Mode B is that route, built and waiting for
   frames.
   ============================================================ */

export type CinemaMode = 'realtime' | 'frames';

export type FrameManifest = {
  /** Manifest format version. Currently 1. */
  version: number;
  /** How many frames the sequence contains. */
  frameCount: number;
  /** Pixel dimensions of each frame. */
  width: number;
  height: number;
  /**
   * Path template for a frame, with `%d` marking the zero-padded index.
   * e.g. "/cinema/frames/raige_%04d.webp"
   */
  pattern: string;
  /** Optional still shown while the sequence loads. */
  poster?: string;
};

/**
 * Where the mode comes from.
 *
 * - `realtime` (default) — never looks for frames, never issues a request
 * - `frames`             — requires the manifest; falls back if it is missing
 * - `auto`               — tries the manifest, quietly uses realtime if absent
 *
 * Set it in `.env`:  VITE_CINEMA_MODE=frames
 */
export const MANIFEST_URL = '/cinema/manifest.json';

export function configuredMode(): 'realtime' | 'frames' | 'auto' {
  const raw = import.meta.env.VITE_CINEMA_MODE;
  if (raw === 'frames' || raw === 'auto' || raw === 'realtime') return raw;
  return 'realtime';
}

/** Resolves a frame's URL from the manifest's pattern. */
export function frameUrl(manifest: FrameManifest, index: number): string {
  return manifest.pattern.replace(/%0(\d+)d/, (_, width: string) =>
    String(index).padStart(Number(width), '0'),
  );
}

/** Reads and sanity-checks the manifest. Returns null when there isn't one. */
export async function loadManifest(signal?: AbortSignal): Promise<FrameManifest | null> {
  try {
    const response = await fetch(MANIFEST_URL, { signal, cache: 'force-cache' });
    if (!response.ok) return null;

    const manifest = (await response.json()) as FrameManifest;
    // A malformed manifest must fall back, never render a broken film.
    if (
      typeof manifest?.frameCount !== 'number' ||
      manifest.frameCount < 2 ||
      typeof manifest.pattern !== 'string' ||
      !manifest.pattern.includes('%')
    ) {
      console.warn('[RAIGE] Frame manifest is malformed; using the realtime scene.');
      return null;
    }
    return manifest;
  } catch {
    return null;
  }
}
