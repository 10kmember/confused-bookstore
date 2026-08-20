/* ═══════════════════════════════════════════════════════════════════════
   VERCEL EDGE MIDDLEWARE — region → currency
   ───────────────────────────────────────────────────────────────────────
   Runs at the edge, before the page is served, on every document request.
   It reads the country Vercel has already worked out for the request and
   leaves a `currency` cookie for the page to read.

   The price itself does not change: £34, €34 and $34 are the same number.
   Only the symbol differs.

   NOTE: if you wire up a real payment link (see CONTENT.md), make sure the
   link for each currency actually charges in that currency. Showing £34 and
   charging $34 is not a rounding difference — it is a different amount of
   money, and buyers will notice.
   ═══════════════════════════════════════════════════════════════════════ */

import { geolocation, next } from '@vercel/edge';

export const config = {
  // Documents only; static assets do not need a currency.
  matcher: ['/', '/index.html'],
};

/** Countries that price in euro. Kept in step with src/core/currency.js. */
const EURO_COUNTRIES = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'ME', 'SM', 'VA', 'XK',
]);

export default function middleware(request) {
  const { country } = geolocation(request);
  const region = (country || request.headers.get('x-vercel-ip-country') || '').toUpperCase();

  const currency = region === 'GB' ? 'GBP' : EURO_COUNTRIES.has(region) ? 'EUR' : 'USD';

  return next({
    headers: {
      'set-cookie': `currency=${currency}; Path=/; Max-Age=86400; SameSite=Lax`,
      // Handy when debugging a deployment, and harmless to leave in.
      'x-shop-region': region || 'unknown',
      'x-shop-currency': currency,
    },
  });
}
