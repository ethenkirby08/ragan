import { useEffect, useRef, useState } from 'react';
import { scrollStore } from './scrollStore';
import { envelope } from './motion';

/* ============================================================
   RAIGE — Shared hooks
   ============================================================ */

/**
 * Respects the OS "reduce motion" setting and reacts to live changes.
 * When true the site presents the same story as a calm, static edit
 * rather than a scroll-scrubbed film.
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/** Viewport query hook — drives the simplified mobile choreography. */
export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (!window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

export const useIsMobile = () => useMediaQuery('(max-width: 820px)');

/**
 * Binds an element's opacity and drift to a window on the cinematic
 * timeline. Style is written directly to the node — no React state, so
 * a chapter reveal costs nothing per frame and reverses exactly.
 */
export function useStoryElement(
  ref: React.RefObject<HTMLElement | null>,
  range: [number, number, number, number],
  options: { drift?: number; scale?: number; enabled?: boolean } = {},
) {
  const { drift = 34, scale = 0, enabled = true } = options;
  const [inStart, inEnd, outStart, outEnd] = range;

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (!enabled) {
      // Reduced-motion / fallback: the chapter is simply present.
      node.style.opacity = '1';
      node.style.transform = 'none';
      node.style.visibility = 'visible';
      return;
    }

    return scrollStore.subscribe((p) => {
      const v = envelope(p, inStart, inEnd, outStart, outEnd);
      node.style.opacity = v.toFixed(3);
      // Hidden chapters must not swallow clicks on the ones on screen.
      node.style.visibility = v < 0.01 ? 'hidden' : 'visible';
      node.style.pointerEvents = v > 0.6 ? 'auto' : 'none';

      const y = (1 - v) * drift;
      const s = scale ? 1 + (1 - v) * scale : 1;
      node.style.transform =
        `translate3d(0, ${y.toFixed(2)}px, 0)` + (scale ? ` scale(${s.toFixed(4)})` : '');
    });
  }, [ref, enabled, drift, scale, inStart, inEnd, outStart, outEnd]);
}

/**
 * Subscribes to timeline progress as React state, throttled to whole
 * percent. Only for UI that genuinely must re-render (e.g. the nav
 * changing colour); never for per-frame animation.
 */
export function useTimelineStep(steps = 100) {
  const [step, setStep] = useState(0);
  useEffect(
    () =>
      scrollStore.subscribe((p) => {
        const next = Math.round(p * steps);
        setStep((prev) => (prev === next ? prev : next));
      }),
    [steps],
  );
  return step / steps;
}

/**
 * Classic in-view reveal for the standard-flow parts of the site
 * (the shop grid, the footer) which are not scroll-scrubbed.
 */
export function useInView<T extends HTMLElement>(
  options: IntersectionObserverInit = { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
) {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.unobserve(entry.target);
        }
      });
    }, options);
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return { ref, inView };
}

/** Pointer parallax, damped. Returns a ref you attach to a container. */
export function usePointerParallax(strength = 1, enabled = true) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !enabled) return;
    let raf = 0;
    let tx = 0;
    let ty = 0;
    let cx = 0;
    let cy = 0;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / innerWidth - 0.5) * strength;
      ty = (e.clientY / innerHeight - 0.5) * strength;
    };

    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      node.style.transform = `translate3d(${(cx * 14).toFixed(2)}px, ${(cy * 10).toFixed(2)}px, 0)`;
      raf = requestAnimationFrame(tick);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [strength, enabled]);

  return ref;
}
