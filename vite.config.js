import { defineConfig } from 'vite';
import { book } from './src/content/book.js';

const escape = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Pours src/content/book.js into index.html at build time, so the markup that
 * ships already carries the right title, byline and price. Doing it here rather
 * than at runtime keeps the page correct for search engines and social cards,
 * and means no visitor ever sees the wrong book flash past before the
 * JavaScript arrives.
 */
function bookContent() {
  return {
    name: 'confused-bookstore:content',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        const listed = book.editions.find((e) => e.id === book.defaultEdition) || book.editions[0];

        const titleLines = book.titleLines
          .map((line, i) => {
            const classes = [i === book.accentLine ? 'is-accent' : '', i % 2 ? 'tilt-a' : 'tilt-b']
              .filter(Boolean)
              .join(' ');
            return `<span class="${classes}">${escape(line)}</span>`;
          })
          .join('\n            ');

        const tokens = {
          title: escape(book.title),
          subtitle: escape(book.subtitle),
          author: escape(book.author),
          authorRole: escape(book.authorRole),
          description: escape(book.description),
          pages: String(book.pages),
          titleLines,
          priceWhole: String(Math.trunc(listed.price)),
          priceCents: `.${String(Math.round((listed.price % 1) * 100)).padStart(2, '0')}`,
          editionTagline: escape(listed.tagline),
          fineprint: escape(book.fineprint),
          pullquote: escape(book.pullquote),
        };

        const filled = html.replace(/\{\{(\w+)\}\}/g, (match, key) =>
          key in tokens ? tokens[key] : match
        );

        return filled.replace('</head>', `    ${structuredData()}\n  </head>`);
      },
    },
  };
}

/**
 * schema.org data for the book. Offers are only advertised once a real payment
 * link exists — until then the checkout is a demonstration, and saying
 * otherwise to a search engine would be a lie with a price attached.
 */
function structuredData() {
  const sellable = book.editions.filter((e) => Object.values(e.links || {}).some((l) => l?.trim()));

  const data = {
    '@context': 'https://schema.org',
    '@type': 'Book',
    name: book.title,
    alternateName: book.subtitle,
    author: { '@type': 'Person', name: book.author },
    publisher: { '@type': 'Organization', name: book.imprint },
    description: book.description,
    numberOfPages: book.pages,
    bookFormat: 'https://schema.org/Hardcover',
    ...(sellable.length
      ? {
          offers: sellable.map((e) => ({
            '@type': 'Offer',
            name: e.label,
            price: e.price,
            priceCurrency: 'USD',
            availability: 'https://schema.org/InStock',
          })),
        }
      : {}),
  };

  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

export default defineConfig({
  base: './',
  plugins: [bookContent()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 2600,
  },
});
