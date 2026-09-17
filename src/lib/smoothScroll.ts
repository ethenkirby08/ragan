import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/* ============================================================
   RAIGE — Smooth scroll

   Lenis provides the weight; GSAP's ticker drives it so scroll and
   animation share one clock (two independent rAF loops is what makes
   scroll-driven sites feel subtly "off").
   ============================================================ */

let lenis: Lenis | null = null;

export function initSmoothScroll(): Lenis {
  if (lenis) return lenis;

  lenis = new Lenis({
    // Low lerp = heavy, unhurried glide. Higher feels twitchy.
    lerp: 0.085,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    // Touch devices keep their native momentum — it already feels right,
    // and hijacking it is the fastest way to make a phone feel broken.
    smoothWheel: true,
    syncTouch: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  // Development-only handle, so automated visual checks can drive the
  // film to an exact position instead of guessing at wheel events.
  if (import.meta.env.DEV) {
    (window as unknown as { __raigeLenis?: Lenis }).__raigeLenis = lenis;
  }

  gsap.ticker.add(tickerCallback);
  gsap.ticker.lagSmoothing(0);

  return lenis;
}

const tickerCallback = (time: number) => {
  lenis?.raf(time * 1000);
};

export function destroySmoothScroll() {
  if (!lenis) return;
  gsap.ticker.remove(tickerCallback);
  lenis.destroy();
  lenis = null;
}

export const getLenis = () => lenis;

/** Jump or glide to a target, going through Lenis so nothing desyncs. */
export function scrollTo(
  target: number | string | HTMLElement,
  options: { immediate?: boolean; offset?: number; duration?: number } = {},
) {
  if (lenis) {
    lenis.scrollTo(target, {
      immediate: options.immediate,
      offset: options.offset ?? 0,
      duration: options.duration ?? 1.4,
    });
    return;
  }
  // Fallback when smooth scrolling is disabled (reduced motion).
  if (typeof target === 'number') {
    window.scrollTo({ top: target, behavior: options.immediate ? 'auto' : 'smooth' });
  } else if (typeof target !== 'string') {
    target.scrollIntoView({ behavior: options.immediate ? 'auto' : 'smooth' });
  }
}

export { gsap, ScrollTrigger };
