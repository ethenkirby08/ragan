import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { RaigeMonogram, RaigeWordmark } from './BrandMark';
import { scrollStore } from '../lib/scrollStore';
import { smoothstep } from '../lib/motion';
import './navigation.css';

/* ============================================================
   RAIGE — Navigation

   Deliberately quiet. It fades up only once the opening shot has
   breathed, and its ink colour tracks the film: cream over the course,
   forest over the cream editorial chapters. It never competes with
   the experience.
   ============================================================ */

const LINKS = [
  { label: 'Collection', to: '/shop' },
  { label: 'About', to: '/#about' },
  { label: 'Journal', to: '/#journal' },
  { label: 'Clubhouse', to: '/#clubhouse' },
];

const CREAM: [number, number, number] = [245, 240, 231];
const FOREST: [number, number, number] = [24, 52, 38];

const mixInk = (t: number) =>
  `rgb(${CREAM.map((c, i) => Math.round(c + (FOREST[i] - c) * t)).join(',')})`;

/** Roughly where the navigation's baseline sits. */
const NAV_LINE = 62;

export default function Navigation({ cinematic = false }: { cinematic?: boolean }) {
  const nav = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  /*
    The navigation's ink is decided by two independent things: where the
    film is (during the cinematic act) and which surface happens to be
    passing under the bar (everywhere else). They are tracked separately
    and combined, because either one alone gets it wrong — cream links
    over the cream shop, or forest links over the dark course.
  */
  const filmInk = useRef(0);
  const surfaceInk = useRef(pathname === '/' ? 0 : 1);

  const applyInk = () => {
    const node = nav.current;
    if (!node) return;
    const ink = Math.max(filmInk.current, surfaceInk.current);
    node.style.setProperty('--nav-ink', mixInk(ink));
    node.style.setProperty('--nav-veil', ink.toFixed(3));
    node.classList.toggle('nav--on-cream', ink > 0.5);
  };

  // Close the mobile menu on navigation.
  useEffect(() => setMenuOpen(false), [pathname]);

  // Lock the page behind the mobile menu.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  /* ---- Which surface is under the bar right now? ---- */
  useEffect(() => {
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>('[data-surface]'),
    );
    if (!targets.length || typeof IntersectionObserver === 'undefined') {
      surfaceInk.current = pathname === '/' ? 0 : 1;
      applyInk();
      return;
    }

    // A one-pixel band at the navigation's baseline: a section
    // "intersects" precisely while it is passing beneath the bar.
    const crossing = new Set<HTMLElement>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const target = entry.target as HTMLElement;
          if (entry.isIntersecting) crossing.add(target);
          else crossing.delete(target);
        });

        // Nothing under the bar means we are over the film again, so fall
        // back to the page's own default rather than keeping stale ink.
        const current = [...crossing].pop();
        surfaceInk.current = current
          ? current.dataset.surface === 'light'
            ? 1
            : 0
          : pathname === '/'
            ? 0
            : 1;
        applyInk();
      },
      {
        rootMargin: `-${NAV_LINE}px 0px -${Math.max(window.innerHeight - NAV_LINE - 1, 0)}px 0px`,
        threshold: 0,
      },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, [pathname]);

  /* ---- Where is the film? ---- */
  useEffect(() => {
    const node = nav.current;
    if (!node) return;

    if (!cinematic) {
      filmInk.current = 0;
      node.style.opacity = '1';
      applyInk();
      return;
    }

    return scrollStore.subscribe((p) => {
      // Hold back through the opening shot, then settle in.
      const presence = smoothstep(0.035, 0.11, p);
      node.style.opacity = (0.62 + presence * 0.38).toFixed(3);

      // Follow the environment from cream ink to forest ink and back.
      filmInk.current = smoothstep(0.6, 0.68, p) * (1 - smoothstep(0.8, 0.88, p));
      applyInk();
    });
  }, [cinematic]);

  return (
    <>
      <header className="nav" ref={nav}>
        <div className="nav__veil" aria-hidden="true" />
        <div className="nav__inner">
          <Link to="/" className="nav__brand" aria-label="RAIGE — home">
            <RaigeMonogram className="nav__monogram" title="" />
            <RaigeWordmark className="nav__wordmark" title="" />
          </Link>

          <nav className="nav__links" aria-label="Primary">
            <ul>
              {LINKS.map((link) => (
                <li key={link.label}>
                  <Link className="nav__link label" to={link.to}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav__actions">
            <Link to="/shop" className="nav__bag label">
              Bag <span aria-hidden="true">(0)</span>
              <span className="sr-only">0 items</span>
            </Link>
            <button
              type="button"
              className="nav__toggle"
              aria-expanded={menuOpen}
              aria-controls="nav-menu"
              onClick={() => setMenuOpen((v) => !v)}
            >
              <span className="sr-only">{menuOpen ? 'Close menu' : 'Open menu'}</span>
              <span className={`nav__bars${menuOpen ? ' is-open' : ''}`} aria-hidden="true">
                <i />
                <i />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile menu */}
      <div
        id="nav-menu"
        className={`nav-menu${menuOpen ? ' is-open' : ''}`}
        hidden={!menuOpen}
      >
        <ul>
          {LINKS.map((link, i) => (
            <li key={link.label} style={{ transitionDelay: `${90 + i * 70}ms` }}>
              <Link to={link.to} className="display">
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="nav-menu__foot eyebrow">Southern and Golf Apparel — Est. 2026</div>
      </div>
    </>
  );
}
