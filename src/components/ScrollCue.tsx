import { useEffect, useRef } from 'react';
import { scrollStore } from '../lib/scrollStore';
import { smoothstep } from '../lib/motion';
import './scroll-cue.css';

/* ============================================================
   RAIGE — Scroll cue

   The only instruction on the site. It appears after the opening shot
   has settled and retires the moment the visitor takes the hint.
   ============================================================ */

export default function ScrollCue() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    return scrollStore.subscribe((p) => {
      // Fade up on arrival, then out as soon as the film is under way.
      const value = (1 - smoothstep(0.004, 0.045, p));
      node.style.opacity = value.toFixed(3);
      node.style.visibility = value < 0.02 ? 'hidden' : 'visible';
    });
  }, []);

  return (
    <div className="scroll-cue" ref={ref} aria-hidden="true">
      <span className="eyebrow">Scroll to play</span>
      <span className="scroll-cue__line">
        <i />
      </span>
    </div>
  );
}
