import { useEffect, useRef, useState } from 'react';
import { RaigeMonogram } from './BrandMark';
import './loader.css';

/* ============================================================
   RAIGE — Loading

   Short, intentional, and incapable of hanging. It waits for the
   brand fonts (which this design genuinely depends on), holds for a
   beat so the open doesn't feel abrupt, and gives up after 2.5s no
   matter what — a visitor must never face a blank screen.
   ============================================================ */

const MIN_DURATION = 1100;
const MAX_DURATION = 2500;

export default function Loader({ onDone }: { onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const done = useRef(false);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;

    const finish = () => {
      if (done.current) return;
      done.current = true;
      const elapsed = performance.now() - start;
      const wait = Math.max(MIN_DURATION - elapsed, 0);
      window.setTimeout(() => {
        setProgress(1);
        setLeaving(true);
        // Hands over the moment the veil clears — any later and the
        // visitor sits looking at an empty forest-green screen.
        window.setTimeout(onDone, 470);
      }, wait);
    };

    // Creep the bar forward so it always reads as motion, never as a stall.
    const tick = () => {
      const elapsed = performance.now() - start;
      setProgress((prev) => (done.current ? prev : Math.min(elapsed / MAX_DURATION, 0.92)));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    if (fonts?.ready) {
      fonts.ready.then(finish).catch(finish);
    } else {
      finish();
    }

    // Hard ceiling — nothing gets to hold the door shut.
    const guard = window.setTimeout(finish, MAX_DURATION);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(guard);
    };
  }, [onDone]);

  return (
    <div className={`loader${leaving ? ' is-leaving' : ''}`} role="status" aria-live="polite">
      <div className="loader__inner">
        <RaigeMonogram className="loader__mark" title="" />
        <div className="loader__word display">RAIGE</div>
        <div className="loader__meta eyebrow">Est. 2026</div>
        <div className="loader__track" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress.toFixed(3)})` }} />
        </div>
      </div>
      <span className="sr-only">Loading the RAIGE experience</span>
    </div>
  );
}
