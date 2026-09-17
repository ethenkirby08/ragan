import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useInView } from '../lib/hooks';
import './ui.css';

/* ============================================================
   RAIGE — Shared interface primitives
   ============================================================ */

type CTAProps = {
  children: ReactNode;
  to?: string;
  href?: string;
  onClick?: () => void;
  variant?: 'line' | 'solid' | 'ghost';
  className?: string;
};

/**
 * The house call-to-action: a rule, a word, and an arrow that steps
 * forward on hover. No fills, no shadows, no bounce.
 */
export function CTA({ children, to, href, onClick, variant = 'line', className }: CTAProps) {
  const content = (
    <>
      <span className="cta__label">{children}</span>
      <span className="cta__arrow" aria-hidden="true">
        <svg viewBox="0 0 26 8" fill="none">
          <path d="M0 4h24M20.5 1 24 4l-3.5 3" stroke="currentColor" strokeWidth="1" />
        </svg>
      </span>
    </>
  );

  const cls = `cta cta--${variant}${className ? ` ${className}` : ''}`;

  if (to) {
    return (
      <Link to={to} className={cls}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={cls}>
        {content}
      </a>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {content}
    </button>
  );
}

/** Standard-flow reveal for the parts of the site that aren't scrubbed. */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'section' | 'li' | 'article' | 'header';
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <Tag
      ref={ref as never}
      className={`reveal${inView ? ' is-in' : ''}${className ? ` ${className}` : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </Tag>
  );
}

/** A small numbered chapter marker, used down the left of the film. */
export function ChapterMark({ index, name }: { index: string; name: string }) {
  return (
    <div className="chapter-mark eyebrow">
      <span className="chapter-mark__index">{index}</span>
      <span className="chapter-mark__rule" aria-hidden="true" />
      <span>{name}</span>
    </div>
  );
}
