import { Suspense, lazy, useEffect, useRef, useState } from 'react';

/*
  Three.js is by far the largest dependency in the project. Loading it
  lazily keeps it out of the shop route's bundle entirely, and lets the
  homepage paint its first frame while the 3D chunk is still arriving.
*/
const CinematicCanvas = lazy(() => import('../scene/CinematicCanvas'));
import { FilmStage, StaticStory } from '../sections/story';
import ShopPreview from '../sections/ShopPreview';
import Editorial from '../sections/Editorial';
import Footer from '../components/Footer';
import ScrollCue from '../components/ScrollCue';
import { scrollStore } from '../lib/scrollStore';
import {
  initSmoothScroll,
  destroySmoothScroll,
  ScrollTrigger,
} from '../lib/smoothScroll';
import { useReducedMotion, useIsMobile } from '../lib/hooks';
import './home.css';

/* ============================================================
   RAIGE — Homepage

   A single tall track drives one ScrollTrigger, which writes one
   number into the scroll store. The 3D scene, the camera, the
   atmosphere and all nine chapters read from that number.

   That is the whole machine. Everything else is composition.
   ============================================================ */

export default function Home() {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const reduced = useReducedMotion();
  const isMobile = useIsMobile();

  /* ---- The timeline ---- */
  useEffect(() => {
    if (reduced) {
      // The reduced-motion edit is an ordinary document. No smooth scroll,
      // no scrubbing — but the scene still knows where the story sits.
      scrollStore.set(0);
      return;
    }

    const node = track.current;
    if (!node) return;

    initSmoothScroll();

    const trigger = ScrollTrigger.create({
      trigger: node,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => scrollStore.set(self.progress),
      onRefresh: (self) => scrollStore.set(self.progress),
    });

    return () => {
      trigger.kill();
      destroySmoothScroll();
      scrollStore.reset();
    };
  }, [reduced]);

  /* ---- Always open on the first tee ----
     A cinematic open that begins halfway through the film because the
     browser restored a scroll position is not an open at all. */
  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    scrollStore.set(0);
    // Let the layout settle before ScrollTrigger measures it.
    const id = window.setTimeout(() => ScrollTrigger.refresh(), 60);
    return () => window.clearTimeout(id);
  }, []);

  /* ---- Stop rendering once the film is off screen ----
     The store below is opaque and covers the canvas completely, so
     there is nothing to draw and no reason to spend a phone's battery. */
  useEffect(() => {
    const node = track.current;
    if (!node || typeof IntersectionObserver === 'undefined') return;

    const io = new IntersectionObserver(
      ([entry]) => setPaused(!entry.isIntersecting),
      { threshold: 0 },
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <>
      {/* The fallback is a plain forest field — the same colour as the
          loader, so there is never a flash of white. */}
      <Suspense fallback={<div className="canvas-placeholder" />}>
        <CinematicCanvas
          simplified={isMobile}
          paused={paused || reduced}
          disabled={reduced}
        />
      </Suspense>

      {reduced ? (
        // ---- Reduced motion: the same story, calmly told ----
        <main id="main">
          <StaticStory />
          <Editorial />
          <ShopPreview />
        </main>
      ) : (
        // ---- The film ----
        <main id="main">
          <FilmStage />
          <ScrollCue />
          {/*
            The track has no content of its own. Its only job is to be
            tall enough to give the film room to play, and to be the
            thing ScrollTrigger measures.
          */}
          <div className="film-track" ref={track} aria-hidden="true" />
          <div className="after-film">
            <ShopPreview />
            <Editorial />
          </div>
        </main>
      )}

      <Footer />
    </>
  );
}
