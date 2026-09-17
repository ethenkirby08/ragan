import { useEffect, useRef } from 'react';
import { scrollStore } from '../lib/scrollStore';
import { clamp, mapRange, smoothstep } from '../lib/motion';
import './fallback.css';

/* ============================================================
   RAIGE — Fallback scene

   Shown when WebGL is unavailable, when the 3D scene throws, or when
   the visitor has asked for reduced motion. It renders the same story
   in pure CSS: sky, tree line, fairway, ball. The site is never blank
   and never unusable, whatever the device does.
   ============================================================ */

export default function FallbackScene({ animated = true }: { animated?: boolean }) {
  const ball = useRef<HTMLDivElement>(null);
  const world = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!animated) return;

    return scrollStore.subscribe((p) => {
      const ballEl = ball.current;
      const worldEl = world.current;

      if (ballEl) {
        // A parabola standing in for the flight, then the roll and the
        // drop into the cup — the same beats as the 3D film, in CSS.
        const flight = clamp(mapRange(p, 0.2, 0.93));
        const arc = Math.sin(flight * Math.PI);
        const x = -10 + flight * 30;
        const y = -arc * 40;
        const scale = 1 + arc * 1.5 - smoothstep(0.86, 1, p) * 0.35;
        const drop = smoothstep(0.975, 1, p) * 14;
        ballEl.style.transform =
          `translate3d(${x.toFixed(2)}vw, ${(y + drop).toFixed(2)}vh, 0) scale(${Math.max(scale, 0.1).toFixed(3)})`;
        ballEl.style.opacity = (1 - smoothstep(0.985, 1, p)).toFixed(3);
        // The tee is only on the ground at the start.
        ballEl.style.setProperty('--tee', p < 0.2 ? '1' : '0');
      }

      if (worldEl) {
        // The environment turns cream for the editorial chapters, exactly
        // as the 3D scene does.
        const editorial =
          smoothstep(0.58, 0.67, p) * (1 - smoothstep(0.81, 0.89, p));
        worldEl.style.setProperty('--editorial', editorial.toFixed(3));
        worldEl.style.setProperty('--horizon', (p * 22).toFixed(2) + 'vh');
      }
    });
  }, [animated]);

  return (
    <div className="fallback" ref={world} aria-hidden="true">
      <div className="fallback__sky" />
      <div className="fallback__sun" />
      <div className="fallback__trees" />
      <div className="fallback__fairway" />
      <div className="fallback__ball" ref={ball} />
      <div className="fallback__wash" />
    </div>
  );
}
