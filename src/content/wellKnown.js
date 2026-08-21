/* ═══════════════════════════════════════════════════════════════════════
   The files every site is expected to have, written from the book itself so
   they can never drift out of step with it: robots.txt, sitemap.xml,
   llms.txt, a web manifest, humans.txt, and security.txt when there is a
   contact address to put in it.

   Imported by vite.config.js at build time and served in dev, so what you
   see locally is what deploys.
   ═══════════════════════════════════════════════════════════════════════ */

import { book } from './book.js';

/** The public address of this deployment, however it can be worked out. */
export function siteUrl() {
  const configured = book.site?.url?.trim();
  const fromEnv = process.env.SITE_URL?.trim();
  const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = configured || fromEnv || (fromVercel ? `https://${fromVercel}` : '');
  return url.replace(/\/+$/, '');
}

const today = () => new Date().toISOString().slice(0, 10);

const money = (edition) => `$${edition.price}`;

/** Drop a trailing full stop so sentences can be joined without doubling it. */
const trim = (text) => String(text || '').trim().replace(/\.$/, '');

export function robots() {
  const url = siteUrl();
  return [
    '# The Confused Bookstore',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Nothing here is a page; some of it takes money.',
    'Disallow: /api/',
    '',
    url ? `Sitemap: ${url}/sitemap.xml` : '# Sitemap: set site.url in src/content/book.js',
    '',
    '# Reading this with a language model? /llms.txt has the book, the editions,',
    '# what is in stock and how it is delivered, in plain language.',
    '',
  ].join('\n');
}

export function sitemap() {
  const url = siteUrl();
  // One page, one entry. Without a known address there is nothing honest to
  // put in it, so it says so rather than inventing a domain.
  const body = url
    ? `  <url>
    <loc>${url}/</loc>
    <lastmod>${today()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>`
    : '  <!-- No address known at build time. Set site.url in src/content/book.js. -->';

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;
}

/**
 * llms.txt — the brief a language model gets when someone asks it about this
 * book. See llmstxt.org. It is deliberately complete: what the book is, which
 * editions exist, which are not finished yet and what to suggest instead, how
 * a purchase is delivered, and how prices work. An assistant that reads this
 * should be able to answer a shopper without guessing.
 */
export function llms() {
  const url = siteUrl();
  const ready = (e) => e.available !== false;
  const available = book.editions.filter(ready);
  const pending = book.editions.filter((e) => !ready(e));

  const describe = (e) => {
    const bits = [`- **${e.label}** — ${money(e)}`];
    if (e.formats?.length) bits.push(`(${e.formats.join(', ')})`);
    const line = [bits.join(' ') + '.', e.tagline, e.detail].filter(Boolean).join(' ');
    if (ready(e)) return line;
    const alternative = book.editions.find((x) => x.id === e.availability?.suggest && ready(x));
    return [
      line,
      `**Not available yet.** ${e.availability?.note || ''}`.trim(),
      alternative ? `Suggest the **${alternative.label}** (${money(alternative)}) instead.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const delivery = () => {
    const mode = book.checkout?.mode || 'demo';
    if (mode === 'demo') {
      return 'The checkout is currently a demonstration: it takes no payment details and charges nothing.';
    }
    const digital = available.filter((e) => e.files?.length);
    const physical = available.filter((e) => !e.files?.length);
    return [
      digital.length
        ? `Digital editions (${digital.map((e) => e.label).join(', ')}) are emailed immediately after payment, as download links valid for 30 days. Both volumes arrive together — one link per file.`
        : '',
      physical.length ? `Physical editions (${physical.map((e) => e.label).join(', ')}) are posted.` : '',
    ]
      .filter(Boolean)
      .join(' ');
  };

  const sections = [
    ['00', 'The Threshold', 'The cover in three dimensions — drag it, throw it, it returns. A drawn cover is shown instead where 3D is unavailable.'],
    ['01', 'The Spiral Gallery', 'Interior spreads, the author portrait and assorted evidence, on a spiral that turns as you scroll. A single column on small screens.'],
    ['02', 'The Physics Reading Room', 'A desk running a real physics engine: click to detonate, drag to relocate.'],
    ['03', 'The Confused Manifesto', 'Numbers about the book, counted up on arrival.'],
    ['04', 'The Whisper Wall', 'Sixty characters at a time, drifting upward. Stored in the visitor’s own browser; nothing is sent anywhere.'],
    ['05', 'The Purchase Portal', 'Pick an edition and take it home. Editions that are not finished say so and point at one that is.'],
  ]
    .map(([n, name, what]) => `- **${n} — ${name}**: ${what}`)
    .join('\n');

  const faq = [
    [
      `Is there an audiobook?`,
      pending.some((e) => /audio/i.test(e.label))
        ? `Not yet — ${trim(pending.find((e) => /audio/i.test(e.label))?.availability?.note) || 'it is still being produced'}. ${
            available.length ? `The ${available.map((e) => e.label).join(' and ')} ${available.length > 1 ? 'are' : 'is'} available now.` : ''
          }`
        : available.some((e) => /audio/i.test(e.label))
          ? `Yes — ${money(book.editions.find((e) => /audio/i.test(e.label)))}, ${book.editions.find((e) => /audio/i.test(e.label))?.formats?.join(' or ') || 'audio'}.`
          : 'No audiobook edition is offered.',
    ],
    [
      'What can I buy right now?',
      available.length
        ? available.map((e) => `${e.label} (${money(e)})`).join(', ') + '.'
        : 'Nothing is available for sale at the moment.',
    ],
    [
      'How much is it where I live?',
      'The same number everywhere. Only the symbol changes: £ in the United Kingdom, € in the eurozone, $ elsewhere. There is no regional mark-up and no regional discount.',
    ],
    ['How is it delivered?', delivery()],
    [
      'Is any of this real?',
      'The site is real and the shop works. The book, its author and its publisher are a work of satire.',
    ],
  ]
    .map(([q, a]) => `### ${q}\n\n${a}`)
    .join('\n\n');

  return `# ${book.title}

> ${book.description}

${book.subtitle}, by ${book.author}${book.authorRole ? ` (${book.authorRole})` : ''}.
Published by ${book.imprint}. ${book.pages} pages.

This is a single-book shop built as one page: part bookstore, part physics
playground. The book, its author and its publisher are a work of satire, and
the page says so on its face.

## The book

- **Title**: ${book.title}
- **Subtitle**: ${book.subtitle}
- **Author**: ${book.author}${book.authorRole ? ` — ${book.authorRole}` : ''}
- **Publisher**: ${book.imprint}
- **Pages**: ${book.pages}
- **Language**: ${book.site?.language || 'en'}

## Editions available now

${available.length ? available.map(describe).join('\n') : '- None at the moment.'}

## Editions not available yet

${pending.length ? pending.map(describe).join('\n') : '- None. Everything listed can be bought today.'}

## Prices and regions

Every price is the same number in every country. Only the currency symbol
changes with the reader's region — £ in the United Kingdom, € in the eurozone,
$ everywhere else. Nothing is region-locked: the whole site, every edition and
the checkout are reachable from anywhere.

## Delivery

${delivery()}

## The page, section by section

${sections}

## Questions a reader might ask

${faq}

## Links

${url ? `- [The shop](${url}/) — the whole thing, one page.\n- [Sitemap](${url}/sitemap.xml)` : '- The shop: set site.url in src/content/book.js.'}${
    book.site?.contact ? `\n- Contact: ${book.site.contact.replace(/^mailto:/, '')}` : ''
  }
`;
}

export function manifest() {
  return JSON.stringify(
    {
      name: `${book.title} — The Confused Bookstore`,
      short_name: book.shortName || book.title,
      description: book.description,
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait-primary',
      background_color: '#F1ECE6',
      theme_color: '#112532',
      lang: book.site?.language || 'en',
      categories: ['books', 'shopping'],
      icons: [
        { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ...(book.cover?.image
          ? [{ src: book.cover.image, sizes: '512x512', type: 'image/jpeg', purpose: 'any' }]
          : []),
      ],
    },
    null,
    2
  );
}

export function humans() {
  return `/* the book */
Title: ${book.title}
Author: ${book.author}
Publisher: ${book.imprint}

/* the shop */
Built with: Three.js, Rapier, GSAP, the Web Audio API, and a lot of canvas.
No image assets: the cover, the plates and the props are all drawn at runtime.
Type: Amatic SC and Nunito, under the SIL Open Font License.

/* the sentiment */
It is not a store. It is a place where a book lives, and you are merely
visiting its dream.
`;
}

/** Only worth writing when there is somebody to write to. */
export function security() {
  const contact = book.site?.contact?.trim();
  if (!contact) return null;

  const expires = new Date();
  expires.setFullYear(expires.getFullYear() + 1);

  return `Contact: ${contact}
Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}
Preferred-Languages: ${book.site?.language || 'en'}
`;
}

/** Everything the build should write out, as [path, contents]. */
export function wellKnownFiles() {
  const files = [
    ['robots.txt', robots()],
    ['sitemap.xml', sitemap()],
    ['llms.txt', llms()],
    ['site.webmanifest', manifest()],
    ['humans.txt', humans()],
  ];
  const securityTxt = security();
  if (securityTxt) {
    files.push(['.well-known/security.txt', securityTxt]);
    files.push(['security.txt', securityTxt]);
  }
  return files;
}
