import { Link } from 'react-router-dom';
import Garment from './Garment';
import { formatPrice, type Product } from '../data/products';
import './product-card.css';

/* ============================================================
   RAIGE — Product card

   Image, name, category, price. Nothing else, and nothing shouts.
   While `product.images` is empty the drawn garment stands in, which
   is why the grid never shows a grey box or a broken icon.
   ============================================================ */

export default function ProductCard({
  product,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const primary = product.images[0];
  const secondary = product.images[1];
  const alt = product.colors[1]?.id ?? product.colors[0].id;

  return (
    <article className="card">
      <Link to={`/shop?product=${product.slug}`} className="card__link">
        <div className="card__frame">
          {product.badge && <span className="card__badge eyebrow">{product.badge}</span>}

          {primary ? (
            <>
              <img
                className="card__image"
                src={primary}
                alt={product.name}
                loading={priority ? 'eager' : 'lazy'}
                decoding="async"
              />
              {secondary && (
                <img
                  className="card__image card__image--alt"
                  src={secondary}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  aria-hidden="true"
                />
              )}
            </>
          ) : (
            <>
              <Garment
                kind={product.garment}
                colorway={product.colors[0].id}
                className="card__garment"
                label={product.name}
              />
              {/* The hover state previews the second colourway. */}
              <Garment
                kind={product.garment}
                colorway={alt}
                className="card__garment card__garment--alt"
              />
            </>
          )}
        </div>

        <div className="card__body">
          <div className="card__text">
            <h3 className="card__name">{product.name}</h3>
            <p className="card__category label">{product.category}</p>
          </div>
          <p className="card__price">{formatPrice(product.price, product.currency)}</p>
        </div>

        <span className="card__view label">
          View
          <svg viewBox="0 0 26 8" fill="none" aria-hidden="true">
            <path d="M0 4h24M20.5 1 24 4l-3.5 3" stroke="currentColor" strokeWidth="1" />
          </svg>
        </span>
      </Link>
    </article>
  );
}
