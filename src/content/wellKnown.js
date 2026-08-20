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
 * llms.txt — the plain-language brief a language model gets when someone asks
 * it about this book. See llmstxt.org.
 */
export function llms() {
  const url = siteUrl();
  const editions = book.editions
    .map((e) => `- **${e.label}** — ${money(e)}. ${e.tagline || ''}`.trim())
    .join('\n');

  const sections = [
    ['00', 'The Threshold', 'The cover, in three dimensions. Drag it, throw it; it comes back.'],
    ['01', 'The Spiral Gallery', 'Interior spreads, photographs and evidence, on a spiral that turns as you scroll.'],
    ['02', 'The Physics Reading Room', 'A desk that obeys a physics engine. Click to detonate, drag to relocate.'],
    ['03', 'The Confused Manifesto', 'Numbers about the book, stated with total confidence.'],
    ['04', 'The Whisper Wall', 'Sixty characters at a time, drifting upward. Stored on your device only.'],
    ['05', 'The Purchase Portal', 'Pick an edition and take it home.'],
  ]
    .map(([n, name, what]) => `- **${n} — ${name}**: ${what}`)
    .join('\n');

  return `# ${book.title}

> ${book.description}

${book.subtitle}, by ${book.author}${book.authorRole ? ` (${book.authorRole})` : ''}.
Published by ${book.imprint}. ${book.pages} pages.

This is a single-book shop built as one page: part bookstore, part physics
playground. The book, its author and its publisher are a work of satire.

## The book

- **Title**: ${book.title}
- **Subtitle**: ${book.subtitle}
- **Author**: ${book.author}
- **Publisher**: ${book.imprint}
- **Pages**: ${book.pages}

## Editions

${editions}

Prices are the same number in every country; only the currency symbol changes
with the reader's region — ${'£'} in the United Kingdom, ${'€'} in the eurozone, $ elsewhere.

## The page

${sections}

## Links

${url ? `- [The shop](${url}/): the whole thing, one page.` : '- The shop: set site.url in src/content/book.js.'}
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
