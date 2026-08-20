/* ═══════════════════════════════════════════════════════════════════════
   REGION → CURRENCY SYMBOL
   ───────────────────────────────────────────────────────────────────────
   The price is the same number everywhere in the world. Only the symbol in
   front of it changes: £ in the United Kingdom, € in the eurozone, $
   everywhere else.

   The region comes from Vercel's Edge Middleware (see middleware.js at the
   repo root), which reads the request's country and leaves a `currency`
   cookie. Off Vercel — local dev, any other host — we fall back to the
   browser's own locale, and then to USD.

   Append ?currency=GBP to any URL to force one while you are working.
   ═══════════════════════════════════════════════════════════════════════ */

export const CURRENCIES = {
  USD: { symbol: '$', code: 'USD', label: 'US dollars' },
  GBP: { symbol: '£', code: 'GBP', label: 'pounds sterling' },
  EUR: { symbol: '€', code: 'EUR', label: 'euro' },
};

/** Countries that price in euro. Kept in step with middleware.js. */
const EURO_COUNTRIES = new Set([
  'AT', 'BE', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT',
  'LU', 'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'ME', 'SM', 'VA', 'XK',
]);

const readCookie = (name) =>
  document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];

/** Best guess from the browser itself, for when no middleware has run. */
function fromLocale() {
  const locales = navigator.languages?.length ? navigator.languages : [navigator.language || 'en-US'];
  for (const locale of locales) {
    let region;
    try {
      region = new Intl.Locale(locale).maximize().region;
    } catch {
      region = locale.split('-')[1];
    }
    if (!region) continue;
    if (region === 'GB') return 'GBP';
    if (EURO_COUNTRIES.has(region)) return 'EUR';
    if (region === 'US') return 'USD';
  }
  return null;
}

let resolved = null;

/** The visitor's currency code: 'USD' | 'GBP' | 'EUR'. */
export function currency() {
  if (resolved) return resolved;

  const override = new URLSearchParams(location.search).get('currency')?.toUpperCase();
  const cookie = readCookie('currency')?.toUpperCase();

  resolved =
    (override && CURRENCIES[override] && override) ||
    (cookie && CURRENCIES[cookie] && cookie) ||
    fromLocale() ||
    'USD';

  return resolved;
}

/** Just the symbol — '$', '£' or '€'. */
export function symbol() {
  return CURRENCIES[currency()].symbol;
}

/**
 * '34' → '£34.00'. The amount never changes with region; only the symbol
 * does, so a price quoted here is the same number for every visitor.
 */
export function format(amount, { cents = true } = {}) {
  const value = cents ? Number(amount).toFixed(2) : String(amount);
  return `${symbol()}${value}`;
}

/** Split for the display treatment in the purchase portal. */
export function parts(amount) {
  const whole = Math.trunc(amount);
  const fraction = Math.round((amount - whole) * 100);
  return {
    symbol: symbol(),
    whole: String(whole),
    cents: `.${String(fraction).padStart(2, '0')}`,
  };
}
