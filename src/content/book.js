/* ═══════════════════════════════════════════════════════════════════════
   THE BOOK
   ───────────────────────────────────────────────────────────────────────
   This is the only file you need to edit to put a different book in the
   shop. Everything downstream reads from here: the 3D cover and spine, the
   hero headline, the page <title>, the gallery plates, the manifesto, the
   whisper seeds and the purchase portal.

   Full instructions live in CONTENT.md.
   ═══════════════════════════════════════════════════════════════════════ */

export const book = {
  /* ── identity ──────────────────────────────────────────────────────── */

  title: "How to Bag a Billionaire's Daughter",
  /** Optional. Used where a long title will not fit — an installed app icon. */
  shortName: 'Bag a Billionaire',
  /** The headline, broken the way you want it to break. */
  titleLines: ['How to Bag a', "Billionaire's", 'Daughter'],
  /** Which of those lines is set in Vintage Rosewood (0-indexed). */
  accentLine: 1,
  subtitle: 'A Field Manual for the Alpha Acquirer',
  author: 'Chadwick P. Worthington III',
  authorRole: 'Founder, The Alpha Acquirer Institute',
  /** Publisher. Appears on the gallery crest and in the page's book data. */
  imprint: 'The Alpha Acquirer Institute',
  /** Two or three characters, stamped on the cover and the gallery crest. */
  monogram: 'III',
  pages: 247,
  description:
    "One book. One author. Zero clarity. A field manual for the alpha acquirer, sold from inside a physics-based dream library.",

  /**
   * Where this shop lives. Fills in the canonical link, the sitemap, robots.txt
   * and llms.txt. Leave `url` empty and the build uses the deployment's own
   * address; set it once you have a domain.
   */
  site: {
    url: '',
    /** 'mailto:you@example.com' — set it and /.well-known/security.txt appears. */
    contact: '',
    language: 'en',
  },

  /* ── artwork ───────────────────────────────────────────────────────────
     Leave these null and the cover is drawn from the text above: rosewood
     leather with gold foil stamping. Point them at files in public/ to use
     your own art instead — see CONTENT.md.                                */

  cover: {
    /** e.g. '/covers/my-book-front.jpg' — portrait, ideally 1000×1450 or larger. */
    image: null,
    /** e.g. '/covers/my-book-spine.jpg' — tall and narrow, ideally 256×1024. */
    spineImage: null,
  },

  /* ── what is actually for sale ─────────────────────────────────────────
     One price per edition. The number is the same everywhere in the world;
     only the currency symbol changes with the visitor's region (see
     middleware.js). Put a real payment link in `links` and the button stops
     being a demonstration — see CONTENT.md.                                */

  /**
   * How the button behaves:
   *   'demo'   — validates and stamps a library card. Takes no money.
   *   'links'  — sends the buyer to the payment link in `links` below.
   *   'stripe' — uses this site's own /api/checkout, and emails the files
   *              after payment. See "Delivering the files" in CONTENT.md.
   */
  checkout: { mode: 'demo' },

  /**
   * Names for the files emailed after a purchase. The keys are yours; they are
   * matched to private URLs in the BOOK_FILES environment variable, so no book
   * file is ever stored in this repository.
   */
  fileLabels: {
    'ebook-vol-1': 'Volume I — EPUB & PDF',
    'ebook-vol-2': 'Volume II — EPUB & PDF',
    'audiobook-vol-1': 'Volume I — Audiobook (M4B)',
    'audiobook-vol-2': 'Volume II — Audiobook (M4B)',
  },

  defaultEdition: 'hardcover',

  editions: [
    {
      id: 'hardcover',
      label: 'Hardcover',
      price: 34,
      tagline: '247 pages. Hardcover. Regrettably real weight.',
      detail: 'Cloth boards, gold foil, and one (1) author photograph taken by his mother.',
      /** Nothing to email — this one arrives in a van. */
      files: [],
      links: { USD: '', GBP: '', EUR: '' },
    },
    {
      id: 'ebook',
      label: 'eBook',
      price: 18,
      tagline: 'Instant, weightless, equally confusing. Both volumes.',
      detail: 'EPUB and PDF. Chapter nine still appears twice; this is not a formatting error.',
      files: ['ebook-vol-1', 'ebook-vol-2'],
      links: { USD: '', GBP: '', EUR: '' },
    },
    {
      id: 'audiobook',
      label: 'Audiobook',
      price: 26,
      tagline: 'Eight hours and twelve minutes, read by the author, at length.',
      detail: 'Unabridged. He does the voices. All of them are his.',
      audio: {
        /** e.g. '/audio/sample.mp3' — a short clip. Null hides the player. */
        sample: null,
        duration: '8h 12m',
        narrator: 'Read by the author',
      },
      files: ['audiobook-vol-1', 'audiobook-vol-2'],
      links: { USD: '', GBP: '', EUR: '' },
    },
    {
      id: 'bundle',
      label: 'All three',
      price: 58,
      tagline: 'The object, the file and the voice. Both volumes of each.',
      detail: 'Three times the confusion, once the postage.',
      files: ['ebook-vol-1', 'ebook-vol-2', 'audiobook-vol-1', 'audiobook-vol-2'],
      links: { USD: '', GBP: '', EUR: '' },
    },
  ],

  /** Shown under the checkout. Say something true here. */
  fineprint:
    'Demonstration checkout. No payment details are requested, collected, or processed — this is a design piece, and the book is a work of satire.',

  /* ── 01 — the spiral gallery ───────────────────────────────────────────
     `kind` picks how a plate is drawn: 'spread', 'portrait', 'napkin',
     'chart', 'crest', 'errata', or 'image' to use a file of your own.     */

  plates: [
    {
      id: 'ch04',
      kind: 'spread',
      chapter: 4,
      figure: 4,
      kicker: 'Interior spread',
      title: 'The Regatta Approach',
      caption: 'SELF, IN RELATION TO EVERYTHING',
      body: 'Chapter four opens with a diagram of the author standing in the centre of five converging attention vectors. None of the arrows point away from him. This is presented as evidence of magnetism rather than of a man blocking a doorway.',
    },
    {
      id: 'author',
      kind: 'portrait',
      /** A real photograph, fitted to the plate. Remove it for the drawn one. */
      photo: '/gallery/author-portrait.jpg',
      kicker: 'The author',
      title: 'A Man, Photographed Generously',
      caption: 'Photographed by his mother, who wishes to remain anonymous.',
      body: 'The only known portrait of Chadwick P. Worthington III, wading through what the acknowledgements call “the paperwork” with a torch he did not bring for the paperwork.',
    },
    {
      id: 'napkin',
      kind: 'napkin',
      kicker: 'Evidence A',
      title: 'The Napkin',
      label: 'EVIDENCE A — RECOVERED, MONACO',
      scrawl: 'call me maybe not',
      number: '+1 (555) 0100 — 0148',
      caption: 'Chapter 7 describes this as “a decisive win.”',
      body: 'Recovered from a harbour-side table in Monaco. The number has been struck through in a hand that is not the author’s. The book files this under “momentum”.',
    },
    {
      id: 'chart',
      kind: 'chart',
      kicker: 'Appendix III',
      title: 'Confidence vs. Results',
      label: 'APPENDIX III — OUTCOMES',
      seriesA: 'CONFIDENCE',
      seriesB: 'RESULTS',
      body: 'Two lines. One climbs. One does not. The manual dedicates eleven pages to the first line and a footnote to the second.',
    },
    {
      id: 'crest',
      kind: 'crest',
      kicker: 'Institutional',
      title: 'The Crest',
      motto: 'EST. LAST TUESDAY · MEMBERSHIP: ONE',
      body: 'Commissioned, designed, awarded and worn by the same person. The motto beneath it reads simply: membership, one.',
    },
    {
      id: 'ch11',
      kind: 'spread',
      chapter: 11,
      figure: 9,
      kicker: 'Interior spread',
      title: 'On Being Escorted Out',
      caption: 'THE EXIT, REFRAMED',
      body: 'Chapter eleven, in which a security handshake is reframed as a networking opportunity and the reader is told, twice, to “stay warm”.',
    },
    {
      id: 'errata',
      kind: 'errata',
      kicker: 'Back matter',
      title: 'Errata, Second Printing',
      label: 'ERRATA — SECOND PRINTING',
      stamp: 'UNRESOLVED',
      items: [
        ['p. 12', 'For “heiress”, read “barista”.'],
        ['p. 44', 'The yacht was a pedalo.'],
        ['p. 91', 'Delete chapter. Reason withheld.'],
        ['p. 133', 'For “we”, read “I”.'],
        ['p. 201', 'The restraining order is not a compliment.'],
        ['p. 247', 'This page intentionally confused.'],
      ],
      body: 'Six corrections. Five of them make the situation worse. The last one is the only honest sentence in the book.',
    },
  ],

  /* ── 03 — the manifesto ────────────────────────────────────────────── */

  stats: [
    {
      value: 247,
      label: 'Pages of deliberate confusion',
      note: 'Numbered 1 through 247, though chapter nine appears twice and chapter ten does not appear at all.',
    },
    {
      value: 13,
      label: 'Chapters that refuse to stay in order',
      note: 'The publisher tried three times. The chapters kept rearranging themselves overnight.',
    },
    {
      value: 1,
      label: 'Book. One author. Zero clarity.',
      note: 'The author is credited eleven times on the cover matter, which is nine more times than is traditional.',
    },
    {
      value: 0,
      label: "Billionaires' daughters, verifiably bagged",
      note: 'The methodology is described as “forward-looking”. Results are described as “imminent”.',
    },
    {
      value: 92,
      suffix: '%',
      label: 'Confidence, entirely unearned',
      note: 'Measured by the author, using an instrument the author also built.',
    },
    {
      value: 6,
      label: 'Legal documents, framed and hung',
      note: 'He calls them reviews. They are not reviews.',
    },
  ],

  pullquote: 'It is not a store. It is a place where a book lives, and you are merely visiting its dream.',

  /* ── 04 — the whisper wall ─────────────────────────────────────────── */

  whisperSeeds: [
    'I only came here for the physics',
    'chapter 9 happens twice and I liked it',
    'the book threw itself at me',
    'is the author okay',
    'I understood none of it. buying two.',
    'the napkin was mine',
    'left my glasses in the reading room',
    'confidence: 92%. results: pending.',
  ],

  /* ── 05 — hovering the price quotes literature, never a discount ───── */

  quotes: [
    ['Confusion is a word we have invented for an order which is not understood.', 'Henry Miller'],
    ['Doubt is not a pleasant condition, but certainty is absurd.', 'Voltaire'],
    ['The only true wisdom is in knowing you know nothing.', 'Socrates'],
    ['A book must be the axe for the frozen sea within us.', 'Franz Kafka'],
    ['Not all those who wander are lost.', 'J. R. R. Tolkien'],
    ['The whole problem with the world is that fools are always so certain of themselves.', 'Bertrand Russell'],
    ['Confusion of goals and perfection of means seems to characterise our age.', 'Albert Einstein'],
  ],
};

/** Look an edition up by id, falling back to the default. */
export function edition(id) {
  return book.editions.find((e) => e.id === id) || book.editions.find((e) => e.id === book.defaultEdition) || book.editions[0];
}

export default book;
