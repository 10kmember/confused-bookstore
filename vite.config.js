import { defineConfig } from 'vite';
import { book } from './src/content/book.js';
import { siteUrl, wellKnownFiles } from './src/content/wellKnown.js';

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

        const url = siteUrl();
        const cover = book.cover?.image ? (url ? url + book.cover.image : book.cover.image) : '';

        // Rendered here rather than by the browser, so the shop and the
        // numbers are in the HTML that ships: readable with JavaScript off, and
        // present for anything that reads the page without running it.
        const editionChips = book.editions
          .map((item) => {
            const checked = item.id === listed.id ? ' checked' : '';
            const soon = item.available === false;
            return `<label class="edition${soon ? ' edition--soon' : ''}">
                <input type="radio" name="edition" value="${escape(item.id)}"${checked} />
                <span class="edition__label">${escape(item.label)}</span>
                <span class="edition__price">$${item.price}</span>${
                  soon ? '\n                <span class="edition__soon">soon</span>' : ''
                }
              </label>`;
          })
          .join('\n              ');

        const statRows = book.stats
          .map(
            (stat, i) => `<li class="stat">
                <span class="stat__num">${String(i + 1).padStart(2, '0')}</span>
                <span class="stat__value" data-value="${stat.value}">${stat.value}${escape(stat.suffix || '')}</span>
                <span class="stat__body">
                  <span class="stat__label">${escape(stat.label)}</span>
                  <span class="stat__note">${escape(stat.note)}</span>
                </span>
              </li>`
          )
          .join('\n              ');

        const tokens = {
          editionChips,
          statRows,
          editionDetail: escape(listed.detail || ''),
          // Each carries its own leading break, so an empty one leaves no gap.
          canonical: url ? `\n    <link rel="canonical" href="${url}/" />` : '',
          ogUrl: url ? `\n    <meta property="og:url" content="${url}/" />` : '',
          ogImage: cover
            ? `\n    <meta property="og:image" content="${escape(cover)}" />\n    <meta name="twitter:card" content="summary_large_image" />`
            : '\n    <meta name="twitter:card" content="summary" />',
          language: escape(book.site?.language || 'en'),
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

        return filled.replace('</head>', `  ${structuredData()}\n  </head>`);
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
            availability:
              e.available === false
                ? 'https://schema.org/PreOrder'
                : 'https://schema.org/InStock',
          })),
        }
      : {}),
  };

  return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/**
 * robots.txt, sitemap.xml, llms.txt and friends, written from the same book
 * data as the page — emitted into the build and served in dev, so what you can
 * open locally is exactly what deploys.
 */
function wellKnown() {
  return {
    name: 'confused-bookstore:well-known',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url.split('?')[0].replace(/^\//, '');
        const match = wellKnownFiles().find(([name]) => name === path);
        if (!match) return next();
        res.setHeader('content-type', contentType(match[0]));
        res.end(match[1]);
      });
    },
    generateBundle() {
      for (const [fileName, source] of wellKnownFiles()) {
        this.emitFile({ type: 'asset', fileName, source });
      }
    },
  };
}

const contentType = (name) =>
  ({
    'sitemap.xml': 'application/xml; charset=utf-8',
    'site.webmanifest': 'application/manifest+json; charset=utf-8',
  })[name] || 'text/plain; charset=utf-8';

export default defineConfig({
  base: './',
  plugins: [bookContent(), wellKnown()],
  server: { host: true, port: 5173 },
  build: {
    target: 'es2022',
    outDir: 'dist',
    assetsInlineLimit: 2048,
    chunkSizeWarningLimit: 2600,
  },
});
