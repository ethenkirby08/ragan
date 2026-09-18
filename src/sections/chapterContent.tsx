import { useState } from 'react';
import { RaigeLockup } from '../components/BrandMark';
import Garment, { type Colorway } from '../components/Garment';
import { CTA, ChapterMark } from '../components/ui';
import { SIGNATURE, formatPrice, CATEGORIES } from '../data/products';

/* ============================================================
   RAIGE — Chapter content

   The words and images of the film, written once. The homepage
   composites them over the 3D scene as scroll-scrubbed overlays; the
   reduced-motion edit lays the very same components out as calm,
   ordinary sections. One source, two presentations.
   ============================================================ */

/* ---- I. The First Tee ---- */
export function FirstTeeContent() {
  return (
    <div className="ch ch--center ch--opening">
      <RaigeLockup
        className="ch__lockup"
        title="RAIGE — Southern and Golf Apparel, est. 2026"
        tone="cream"
      />
      <h1 className="display ch__line">
        The Southern game,
        <br />
        reimagined.
      </h1>
    </div>
  );
}

/* ---- II. Impact ----
   Almost nothing on screen. The strike should be felt, not narrated. */
export function ImpactContent() {
  return (
    <div className="ch ch--corner">
      <ChapterMark index="II" name="Impact" />
    </div>
  );
}

/* ---- III. Flight ---- */
export function FlightContent() {
  return (
    <div className="ch ch--left">
      <ChapterMark index="III" name="Flight" />
      <h2 className="display ch__headline">
        Southern roots.
        <br />
        Modern game.
      </h2>
    </div>
  );
}

/* ---- IV. Apex ---- */
export function ApexContent() {
  return (
    <div className="ch ch--right">
      <h2 className="display ch__headline">
        Built for
        <br />
        the course.
      </h2>
      <p className="lede ch__lede">
        Cut for the swing, finished for the clubhouse, and made to be worn
        long after the card is signed.
      </p>
    </div>
  );
}

/* ---- V. The Collection ---- */
export function CollectionContent() {
  return (
    <div className="ch ch--split">
      <div className="ch__col">
        <ChapterMark index="V" name="The Collection" />
        <h2 className="display ch__headline">The Collection</h2>
        <p className="lede ch__lede">
          Six pieces. One season. Every one of them built to be worn on the
          first tee and everywhere the round takes you afterwards.
        </p>
        <CTA to="/shop">Explore the collection</CTA>
      </div>
      <div className="ch__col ch__col--art">
        <div className="plate">
          <div className="plate__disc" aria-hidden="true" />
          <Garment kind="polo" colorway="forest" className="plate__garment" />
        </div>
      </div>
    </div>
  );
}

/* ---- VI. The signature product ----
   A working demonstration of how a real product will be presented.
   Selection is local state only — there is deliberately no cart yet. */
export function ProductContent() {
  const [color, setColor] = useState<Colorway>(SIGNATURE.colors[0].id);
  const [size, setSize] = useState(SIGNATURE.sizes[2]);

  return (
    <div className="ch ch--split ch--product">
      <div className="ch__col ch__col--art">
        <div className="plate plate--tall">
          <div className="plate__disc" aria-hidden="true" />
          <Garment
            kind={SIGNATURE.garment}
            colorway={color}
            className="plate__garment"
            label={`${SIGNATURE.name} in ${SIGNATURE.colors.find((c) => c.id === color)?.name}`}
          />
        </div>
      </div>

      <div className="ch__col">
        <ChapterMark index="VI" name="Signature" />
        <h2 className="display ch__headline ch__headline--product">{SIGNATURE.name}</h2>
        <div className="product-meta">
          <span className="label">{SIGNATURE.category}</span>
          <span className="product-meta__price">{formatPrice(SIGNATURE.price)}</span>
        </div>
        <p className="lede ch__lede">{SIGNATURE.description}</p>

        <div className="swatches">
          <span className="eyebrow swatches__title">Colour — {SIGNATURE.colors.find((c) => c.id === color)?.name}</span>
          <div className="swatches__row">
            {SIGNATURE.colors.map((c) => (
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
            {SIGNATURE.sizes.map((s) => (
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

        <CTA to={`/shop?product=${SIGNATURE.slug}`}>View the piece</CTA>
      </div>
    </div>
  );
}

/* ---- VII. Categories ---- */
export function CategoriesContent() {
  return (
    <div className="ch ch--center ch--categories">
      <h2 className="display ch__headline">
        The game is
        <br />
        in the details.
      </h2>
      <ul className="destinations">
        {CATEGORIES.map((c) => (
          <li key={c.id}>
            <a href={`/shop?category=${c.id}`} className="destination">
              <span className="destination__name display">{c.name}</span>
              <span className="destination__line">{c.line}</span>
              <span className="destination__arrow" aria-hidden="true">
                <svg viewBox="0 0 26 8" fill="none">
                  <path d="M0 4h24M20.5 1 24 4l-3.5 3" stroke="currentColor" strokeWidth="1" />
                </svg>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ---- VIII. The Green ---- */
export function GreenContent() {
  return (
    <div className="ch ch--corner ch--green">
      <ChapterMark index="VIII" name="The Green" />
      <p className="ch__quiet display">Quiet, and then the sound every golfer knows.</p>
    </div>
  );
}

/* ---- IX. The Clubhouse ---- */
export function ClubhouseContent() {
  return (
    <div className="ch ch--center ch--clubhouse">
      <span className="eyebrow ch__eyebrow">Est. 2026 — Southern and Golf Apparel</span>
      <h2 className="display ch__final">Welcome to RAIGE.</h2>
      <CTA to="/shop" variant="ghost" className="ch__enter">
        Enter the collection
      </CTA>
    </div>
  );
}
