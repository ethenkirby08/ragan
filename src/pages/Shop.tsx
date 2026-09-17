import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import Garment, { type Colorway } from '../components/Garment';
import { CTA, Reveal } from '../components/ui';
import Footer from '../components/Footer';
import {
  PRODUCTS,
  CATEGORIES,
  filterByCategory,
  formatPrice,
  getBySlug,
  type CategoryId,
} from '../data/products';
import './shop.css';

/* ============================================================
   RAIGE — Shop

   The store skeleton. It carries the same palette, type and restraint
   as the film, so arriving here does not feel like leaving the brand.

   There is no cart and no checkout by design — see README for what
   comes next.
   ============================================================ */

type Filter = CategoryId | 'all';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  ...CATEGORIES.map((c) => ({ id: c.id as Filter, label: c.name })),
];

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const categoryParam = (params.get('category') as Filter) ?? 'all';
  const productParam = params.get('product');

  const filter: Filter = FILTERS.some((f) => f.id === categoryParam)
    ? categoryParam
    : 'all';

  const products = useMemo(() => filterByCategory(PRODUCTS, filter), [filter]);
  const active = productParam ? getBySlug(productParam) : undefined;

  const setFilter = (next: Filter) => {
    const updated = new URLSearchParams(params);
    if (next === 'all') updated.delete('category');
    else updated.set('category', next);
    updated.delete('product');
    setParams(updated, { replace: true });
  };

  const closeDetail = () => {
    const updated = new URLSearchParams(params);
    updated.delete('product');
    setParams(updated, { replace: true });
  };

  // The shop is an ordinary document — always start it at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <main className="shop" id="main" data-surface="light">
        <header className="shop__head">
          <Reveal>
            <span className="eyebrow shop__eyebrow">Southern and Golf Apparel</span>
            <h1 className="display shop__title">Shop RAIGE</h1>
            <p className="lede shop__lede">
              The opening collection. Six pieces, made in small runs, built
              for the course and everywhere the round takes you after it.
            </p>
          </Reveal>
        </header>

        <div className="shop__bar">
          <nav className="filters" aria-label="Filter by category">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter label${filter === f.id ? ' is-active' : ''}`}
                onClick={() => setFilter(f.id)}
                aria-pressed={filter === f.id}
              >
                {f.label}
              </button>
            ))}
          </nav>
          <p className="shop__count label" aria-live="polite">
            {products.length} {products.length === 1 ? 'piece' : 'pieces'}
          </p>
        </div>

        {products.length > 0 ? (
          <div className="shop__grid">
            {products.map((product, i) => (
              <Reveal key={product.id} delay={i * 60} as="div">
                <ProductCard product={product} priority={i < 3} />
              </Reveal>
            ))}
          </div>
        ) : (
          <p className="shop__empty">Nothing in this category yet. More is coming.</p>
        )}
      </main>

      <Footer />

      {active && <ProductDetail product={active} onClose={closeDetail} />}
    </>
  );
}

/* ------------------------------------------------------------
   Quick view
   ------------------------------------------------------------ */
function ProductDetail({
  product,
  onClose,
}: {
  product: ReturnType<typeof getBySlug> & {};
  onClose: () => void;
}) {
  const [color, setColor] = useState<Colorway>(product.colors[0].id);
  const [size, setSize] = useState(product.sizes[Math.min(2, product.sizes.length - 1)]);
  const panel = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  // Escape closes, the page behind holds still, and focus lands inside.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div
      className="detail"
      role="dialog"
      aria-modal="true"
      aria-labelledby="detail-title"
    >
      <button
        type="button"
        className="detail__scrim"
        onClick={onClose}
        tabIndex={-1}
        aria-hidden="true"
      />
      <div className="detail__panel" ref={panel}>
        <button type="button" className="detail__close" onClick={onClose} ref={closeButton}>
          <span className="sr-only">Close</span>
          <svg viewBox="0 0 20 20" aria-hidden="true" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.2" />
          </svg>
        </button>

        <div className="detail__art">
          {product.images[0] ? (
            <img src={product.images[0]} alt={product.name} />
          ) : (
            <Garment
              kind={product.garment}
              colorway={color}
              className="detail__garment"
              label={product.name}
            />
          )}
        </div>

        <div className="detail__body">
          <span className="eyebrow detail__collection">{product.collection}</span>
          <h2 className="display detail__title" id="detail-title">
            {product.name}
          </h2>
          <p className="detail__price">{formatPrice(product.price, product.currency)}</p>
          <p className="detail__description">{product.description}</p>

          <div className="swatches">
            <span className="eyebrow swatches__title">
              Colour — {product.colors.find((c) => c.id === color)?.name}
            </span>
            <div className="swatches__row">
              {product.colors.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`swatch${color === c.id ? ' is-active' : ''}`}
                  style={{ '--swatch': c.hex } as React.CSSProperties}
                  onClick={() => setColor(c.id)}
                  aria-pressed={color === c.id}
                >
                  <span className="sr-only">{c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="sizes">
            <span className="eyebrow swatches__title">Size</span>
            <div className="sizes__row">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`size${size === s ? ' is-active' : ''}`}
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <ul className="detail__specs">
            {product.detail.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

          {/* Deliberately inert: commerce is the next phase, not this one. */}
          <CTA variant="solid" onClick={() => undefined}>
            Add to bag — coming soon
          </CTA>
          <p className="detail__note">
            Checkout opens with the 2026 season. Join the list in the footer for
            first access.
          </p>
        </div>
      </div>
    </div>
  );
}
