import { useEffect, useRef, type ReactNode } from 'react';
import { useStoryElement } from '../lib/hooks';
import { scrollStore } from '../lib/scrollStore';
import { smoothstep } from '../lib/motion';
import {
  FirstTeeContent,
  ImpactContent,
  FlightContent,
  ApexContent,
  CollectionContent,
  ProductContent,
  CategoriesContent,
  GreenContent,
  ClubhouseContent,
} from './chapterContent';
import './story.css';

/* ============================================================
   RAIGE — The story

   Nine chapters on one timeline. Each declares the window of scroll
   progress it owns; the film stage fades and drifts them through
   those windows, and the reduced-motion edit simply stacks them.
   ============================================================ */

export type ChapterDef = {
  id: string;
  /** Read by screen readers and used as the static-edit heading. */
  title: string;
  /** [fade-in start, fade-in end, fade-out start, fade-out end] */
  window: [number, number, number, number];
  /** Which way the ink runs against the environment behind it. */
  ink: 'cream' | 'forest';
  drift?: number;
  content: ReactNode;
};

export const CHAPTERS: ChapterDef[] = [
  {
    id: 'first-tee',
    title: 'The First Tee',
    // Open at progress 0 and still open at the tee's resting point (0.075).
    window: [-0.06, -0.02, 0.105, 0.15],
    ink: 'cream',
    drift: 26,
    content: <FirstTeeContent />,
  },
  {
    id: 'impact',
    title: 'Impact',
    // Fully open at the impact rest (0.212).
    window: [0.168, 0.196, 0.232, 0.255],
    ink: 'cream',
    drift: 14,
    content: <ImpactContent />,
  },
  {
    id: 'flight',
    title: 'Flight',
    // Spans both flight rests (launch 0.275 and flight 0.355).
    window: [0.243, 0.268, 0.378, 0.415],
    ink: 'cream',
    drift: 44,
    content: <FlightContent />,
  },
  {
    id: 'apex',
    title: 'Built for the course',
    // Fully open at the apex rest (0.515).
    window: [0.45, 0.488, 0.548, 0.588],
    ink: 'cream',
    drift: 40,
    content: <ApexContent />,
  },
  {
    id: 'collection',
    title: 'The Collection',
    window: [0.6, 0.635, 0.672, 0.7],
    ink: 'forest',
    drift: 38,
    content: <CollectionContent />,
  },
  {
    id: 'signature',
    title: 'The Southern Polo',
    window: [0.705, 0.735, 0.775, 0.8],
    ink: 'forest',
    drift: 34,
    content: <ProductContent />,
  },
  {
    id: 'categories',
    title: 'The game is in the details',
    window: [0.805, 0.828, 0.858, 0.878],
    ink: 'forest',
    drift: 34,
    content: <CategoriesContent />,
  },
  {
    id: 'green',
    title: 'The Green',
    // Fully open at the green rest (0.958).
    window: [0.903, 0.923, 0.976, 0.99],
    ink: 'cream',
    drift: 22,
    content: <GreenContent />,
  },
  {
    id: 'clubhouse',
    title: 'Welcome to RAIGE',
    window: [0.972, 0.99, 1.4, 1.5],
    ink: 'cream',
    drift: 30,
    content: <ClubhouseContent />,
  },
];

/* ------------------------------------------------------------
   Scrubbed chapter
   ------------------------------------------------------------ */
function Chapter({ chapter }: { chapter: ChapterDef }) {
  const ref = useRef<HTMLElement>(null);
  useStoryElement(ref, chapter.window, { drift: chapter.drift ?? 32 });

  return (
    <section
      ref={ref}
      className={`chapter chapter--${chapter.ink}`}
      aria-label={chapter.title}
      // Starts hidden; the subscription sets the true value on mount.
      style={{ opacity: 0, visibility: 'hidden' }}
    >
      {chapter.content}
    </section>
  );
}

/**
 * The closing fade.
 *
 * As the ball drops into the cup the course darkens to forest. It gives
 * the final chapter the contrast its headline needs, and it reads as what
 * it is: the lights going down at the end of the film.
 */
function ClosingVeil() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    return scrollStore.subscribe((p) => {
      const value = smoothstep(0.945, 0.995, p) * 0.78;
      node.style.opacity = value.toFixed(3);
      node.style.visibility = value < 0.005 ? 'hidden' : 'visible';
    });
  }, []);

  return <div className="closing-veil" ref={ref} aria-hidden="true" />;
}

/** The fixed stage the whole film plays on. */
export function FilmStage() {
  return (
    <div className="film-stage" aria-label="The RAIGE film">
      <ClosingVeil />
      {CHAPTERS.map((chapter) => (
        <Chapter key={chapter.id} chapter={chapter} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------
   The reduced-motion edit

   Same nine chapters, same words, no scroll hijacking and no
   scrubbing — just a well-set document.
   ------------------------------------------------------------ */
export function StaticStory() {
  return (
    <div className="static-story">
      {CHAPTERS.map((chapter) => (
        <section
          key={chapter.id}
          className={`static-chapter static-chapter--${chapter.ink}`}
          aria-label={chapter.title}
        >
          {chapter.content}
        </section>
      ))}
    </div>
  );
}
