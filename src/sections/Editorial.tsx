import { CTA, Reveal } from '../components/ui';
import Garment from '../components/Garment';
import './editorial.css';

/* ============================================================
   RAIGE — Editorial bands

   About, Journal and Clubhouse. These exist so every item in the
   navigation leads somewhere real rather than to a dead anchor.
   ============================================================ */

const JOURNAL = [
  {
    id: 'j1',
    kicker: 'Field Notes — 01',
    title: 'What the first tee asks of you',
    excerpt:
      'A round begins before the first swing. On ritual, nerve, and the walk from the car park to the starter.',
    garment: 'cap' as const,
  },
  {
    id: 'j2',
    kicker: 'Craft — 02',
    title: 'Why we mercerise the pique',
    excerpt:
      'An extra process most brands skip. It costs more, takes longer, and is the reason the collar still stands at the turn.',
    garment: 'polo' as const,
  },
  {
    id: 'j3',
    kicker: 'Places — 03',
    title: 'Morning light, Southern clubs',
    excerpt:
      'Six in the morning, low sun through the pines, and the particular quiet of a course before anyone else arrives.',
    garment: 'headcover' as const,
  },
];

export default function Editorial() {
  return (
    <>
      {/* ---- About ---- */}
      <section className="band band--about" id="about" data-surface="light">
        <div className="band__inner band__inner--split">
          <Reveal>
            <span className="eyebrow band__eyebrow">Our Story</span>
            <h2 className="display band__title">
              Founded on a Southern
              <br />
              course, in 2026.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="band__body">
              <p>
                RAIGE began with a simple frustration: golf clothing that
                looked like sportswear, or clubhouse clothing that could not
                survive a swing. We could not find a single piece that did
                both properly, so we made one.
              </p>
              <p>
                Everything we make starts on a Southern course at first light
                and is judged by one question — would you happily wear it to
                dinner afterwards? If the answer is no, it does not ship.
              </p>
              <CTA href="#journal">Read the journal</CTA>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- Journal ---- */}
      <section className="band band--journal" id="journal" data-surface="light">
        <div className="band__inner">
          <Reveal>
            <span className="eyebrow band__eyebrow">Journal</span>
            <h2 className="display band__title">From the course</h2>
          </Reveal>

          <ul className="journal">
            {JOURNAL.map((entry, i) => (
              <Reveal as="li" key={entry.id} delay={i * 90}>
                <article className="journal__entry">
                  <div className="journal__frame">
                    <Garment kind={entry.garment} colorway="forest" className="journal__art" />
                  </div>
                  <span className="eyebrow journal__kicker">{entry.kicker}</span>
                  <h3 className="journal__title">{entry.title}</h3>
                  <p className="journal__excerpt">{entry.excerpt}</p>
                </article>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Clubhouse ---- */}
      <section className="band band--clubhouse" id="clubhouse" data-surface="dark">
        <div className="band__inner band__inner--center">
          <Reveal>
            <span className="eyebrow band__eyebrow">The Clubhouse</span>
            <h2 className="display band__title band__title--large">
              Members hear first.
            </h2>
            <p className="lede band__lede">
              Every RAIGE piece is made in a small run. The clubhouse list gets
              the drop before it reaches the shop — and nothing else.
            </p>
            <CTA to="/shop" variant="solid">
              Enter the collection
            </CTA>
          </Reveal>
        </div>
      </section>
    </>
  );
}
