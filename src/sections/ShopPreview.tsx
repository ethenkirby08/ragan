import ProductCard from '../components/ProductCard';
import { CTA, Reveal } from '../components/ui';
import { PRODUCTS } from '../data/products';
import './shop-preview.css';

/* ============================================================
   RAIGE — Shop preview

   Where the film ends and the store begins. It inherits the same
   palette, type and restraint, so crossing from one to the other
   never feels like landing on a different website.
   ============================================================ */

export default function ShopPreview() {
  return (
    <section className="shop-preview" id="shop" data-surface="light">
      <header className="shop-preview__head">
        <Reveal>
          <span className="eyebrow shop-preview__eyebrow">The Collection — 2026</span>
        </Reveal>
        <Reveal delay={90}>
          <h2 className="display shop-preview__title">Shop RAIGE</h2>
        </Reveal>
        <Reveal delay={170}>
          <p className="lede shop-preview__lede">
            Six pieces to open the season. Made in small runs, built to be
            worn hard, and finished the way a Southern club expects.
          </p>
        </Reveal>
      </header>

      <div className="shop-preview__grid">
        {PRODUCTS.map((product, i) => (
          <Reveal key={product.id} delay={i * 70} as="div">
            <ProductCard product={product} priority={i < 3} />
          </Reveal>
        ))}
      </div>

      <Reveal className="shop-preview__foot">
        <CTA to="/shop" variant="solid">
          Enter the full collection
        </CTA>
      </Reveal>
    </section>
  );
}
