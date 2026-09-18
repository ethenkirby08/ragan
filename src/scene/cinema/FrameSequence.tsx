import { useEffect, useRef, useState } from 'react';
import { scrollStore } from '../../lib/scrollStore';
import { frameUrl, type FrameManifest } from './mode';
import './frame-sequence.css';

/* ============================================================
   RAIGE — Mode B: pre-rendered cinematic sequence

   scroll → damped timeline → frame index → canvas

   The same relationship the realtime scene has to the timeline, with a
   rendered frame in place of a draw call. Because the timeline is
   already damped and speed-limited upstream, scrubbing is smooth and
   reverses cleanly for free.

   Loading is deliberately two-pass. A cinematic sequence is tens of
   megabytes, and waiting for all of it before showing anything would
   put a spinner in front of the one moment the site has to land. So a
   sparse pass loads every Nth frame first — enough to scrub the whole
   film immediately, if a little steppy — and the gaps fill in behind
   it. Until a frame arrives, the nearest one already decoded is drawn.
   ============================================================ */

/** Every Nth frame in the first pass. Eight is roughly 3fps of coverage. */
const COARSE_STRIDE = 8;
/** Decoded frames in flight at once. Keeps memory and sockets sane. */
const CONCURRENCY = 6;

export default function FrameSequence({
  manifest,
  onFailure,
}: {
  manifest: FrameManifest;
  /** Called if the sequence cannot be shown, so the host can fall back. */
  onFailure: () => void;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const frames = useRef<(ImageBitmap | HTMLImageElement | null)[]>([]);
  const loaded = useRef<number[]>([]);
  const [ready, setReady] = useState(false);

  /* ---- Load ---- */
  useEffect(() => {
    let cancelled = false;
    frames.current = new Array(manifest.frameCount).fill(null);
    loaded.current = [];

    const decode = async (index: number) => {
      const url = frameUrl(manifest, index);
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error(`frame ${index}: ${response.status}`);
      const blob = await response.blob();

      // createImageBitmap decodes off the main thread; without it a long
      // scrub stutters as each frame decodes inline.
      const bitmap =
        typeof createImageBitmap === 'function'
          ? await createImageBitmap(blob)
          : await new Promise<HTMLImageElement>((resolve, reject) => {
              const img = new Image();
              img.onload = () => resolve(img);
              img.onerror = reject;
              img.src = URL.createObjectURL(blob);
            });

      if (cancelled) return;
      frames.current[index] = bitmap;
      // Kept sorted so the nearest-frame search stays a binary search.
      const at = bisect(loaded.current, index);
      loaded.current.splice(at, 0, index);
    };

    const run = async () => {
      // Pass one: a sparse spread across the whole film.
      const coarse: number[] = [];
      for (let i = 0; i < manifest.frameCount; i += COARSE_STRIDE) coarse.push(i);
      if (coarse[coarse.length - 1] !== manifest.frameCount - 1) {
        coarse.push(manifest.frameCount - 1);
      }

      try {
        await pool(coarse, CONCURRENCY, decode, () => cancelled);
      } catch (error) {
        if (!cancelled) {
          console.warn('[RAIGE] Frame sequence failed to load.', error);
          onFailure();
        }
        return;
      }

      if (cancelled) return;
      setReady(true);

      // Pass two: everything else, quietly, behind the scrub.
      const rest: number[] = [];
      for (let i = 0; i < manifest.frameCount; i++) {
        if (!frames.current[i]) rest.push(i);
      }
      pool(rest, CONCURRENCY, decode, () => cancelled).catch(() => {
        /* A gap in the fine pass is survivable: the coarse pass covers it. */
      });
    };

    run();

    return () => {
      cancelled = true;
      frames.current.forEach((frame) => {
        if (frame && 'close' in frame) frame.close();
      });
      frames.current = [];
      loaded.current = [];
    };
  }, [manifest, onFailure]);

  /* ---- Draw ---- */
  useEffect(() => {
    if (!ready) return;
    const node = canvas.current;
    if (!node) return;
    const ctx = node.getContext('2d', { alpha: false });
    if (!ctx) {
      onFailure();
      return;
    }

    let raf = 0;
    let shown = -1;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      node.width = Math.round(window.innerWidth * dpr);
      node.height = Math.round(window.innerHeight * dpr);
      shown = -1; // force a redraw at the new size
    };

    const paint = () => {
      const index = Math.round(scrollStore.get() * (manifest.frameCount - 1));
      const nearest = nearestLoaded(loaded.current, index);

      if (nearest !== -1 && nearest !== shown) {
        const frame = frames.current[nearest];
        if (frame) {
          // Cover, not contain: a letterboxed hero is not a hero.
          const scale = Math.max(node.width / manifest.width, node.height / manifest.height);
          const w = manifest.width * scale;
          const h = manifest.height * scale;
          ctx.drawImage(frame, (node.width - w) / 2, (node.height - h) / 2, w, h);
          shown = nearest;
        }
      }
      raf = requestAnimationFrame(paint);
    };

    resize();
    window.addEventListener('resize', resize);
    raf = requestAnimationFrame(paint);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
    };
  }, [ready, manifest, onFailure]);

  return (
    <canvas
      ref={canvas}
      className={`frame-sequence${ready ? ' is-ready' : ''}`}
      aria-hidden="true"
    />
  );
}

/* ---- helpers ---- */

function bisect(sorted: number[], value: number) {
  let low = 0;
  let high = sorted.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if (sorted[mid] < value) low = mid + 1;
    else high = mid;
  }
  return low;
}

/** The closest frame we actually have decoded, either side of the target. */
function nearestLoaded(sorted: number[], index: number) {
  if (sorted.length === 0) return -1;
  const at = bisect(sorted, index);
  if (at === 0) return sorted[0];
  if (at === sorted.length) return sorted[sorted.length - 1];
  const before = sorted[at - 1];
  const after = sorted[at];
  return index - before <= after - index ? before : after;
}

/** Runs a bounded number of loads at once, in order. */
async function pool<T>(
  items: T[],
  limit: number,
  work: (item: T) => Promise<void>,
  cancelled: () => boolean,
) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length && !cancelled()) {
      const item = items[cursor++];
      await work(item);
    }
  });
  await Promise.all(workers);
}
