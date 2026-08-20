/* POST /api/checkout — start a Stripe Checkout session for one edition. */

import { book, edition, env, json, minorUnits, stripe } from './_lib.js';

const CURRENCIES = new Set(['usd', 'gbp', 'eur']);

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const item = edition(body.editionId);
    if (!item) return json(res, 400, { error: 'Unknown edition' });

    const quantity = Math.min(Math.max(Math.trunc(Number(body.quantity) || 1), 1), 13);
    const currency = CURRENCIES.has(String(body.currency).toLowerCase())
      ? String(body.currency).toLowerCase()
      : 'usd';

    // The origin is taken from the request, never from the caller's payload —
    // an attacker must not be able to point the success redirect elsewhere.
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const origin = env('SITE_URL', `${proto}://${host}`).replace(/\/$/, '');

    const session = await stripe('checkout/sessions', {
      mode: 'payment',
      success_url: `${origin}/?purchase=success`,
      cancel_url: `${origin}/?purchase=cancelled#portal`,
      customer_email: typeof body.email === 'string' && body.email.includes('@') ? body.email : undefined,
      allow_promotion_codes: 'true',
      metadata: { editionId: item.id },
      line_items: [
        {
          quantity,
          price_data: {
            currency,
            unit_amount: minorUnits(item.price),
            product_data: {
              name: `${book.title} — ${item.label}`,
              description: item.tagline || undefined,
            },
          },
        },
      ],
    });

    return json(res, 200, { url: session.url });
  } catch (error) {
    console.error('checkout failed', error);
    return json(res, 500, { error: error.message || 'Checkout could not be started' });
  }
}
