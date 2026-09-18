import { Link } from 'react-router-dom';
import { RaigeLockup } from './BrandMark';
import './footer.css';

/* ============================================================
   RAIGE — Footer
   ============================================================ */

const COLUMNS = [
  {
    title: 'Shop',
    links: [
      { label: 'All Apparel', to: '/shop?category=apparel' },
      { label: 'Accessories', to: '/shop?category=accessories' },
      { label: 'New Arrivals', to: '/shop?category=new' },
    ],
  },
  {
    title: 'The Club',
    links: [
      { label: 'Our Story', to: '/#about' },
      { label: 'Journal', to: '/#journal' },
      { label: 'Clubhouse', to: '/#clubhouse' },
    ],
  },
  {
    title: 'Service',
    links: [
      { label: 'Shipping', to: '/#shipping' },
      { label: 'Returns', to: '/#returns' },
      { label: 'Contact', to: '/#contact' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="footer" data-surface="dark">
      <div className="footer__inner">
        <div className="footer__brand">
          <RaigeLockup className="footer__lockup" title="RAIGE" tone="cream" />
        </div>

        <div className="footer__columns">
          {COLUMNS.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="eyebrow footer__title">{column.title}</h2>
              <ul>
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="footer__link">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="footer__signup">
            <h2 className="eyebrow footer__title">The List</h2>
            <p className="footer__note">
              First access to every drop, and nothing else.
            </p>
            {/* TODO: wire to an email provider when marketing is ready. */}
            <form
              className="footer__form"
              onSubmit={(e) => {
                e.preventDefault();
              }}
            >
              <label className="sr-only" htmlFor="footer-email">
                Email address
              </label>
              <input
                id="footer-email"
                type="email"
                name="email"
                placeholder="Email address"
                autoComplete="email"
                required
              />
              <button type="submit" aria-label="Join the list">
                <svg viewBox="0 0 26 8" fill="none" aria-hidden="true">
                  <path d="M0 4h24M20.5 1 24 4l-3.5 3" stroke="currentColor" strokeWidth="1" />
                </svg>
              </button>
            </form>
          </div>
        </div>

        <div className="footer__base">
          <p className="footer__fine">© 2026 RAIGE. Southern and Golf Apparel.</p>
          <p className="footer__fine">Est. 2026 — Made in the American South.</p>
        </div>
      </div>
    </footer>
  );
}
