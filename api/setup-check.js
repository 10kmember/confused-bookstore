/* GET /api/setup-check — is this deployment actually able to sell anything?
   Reports only whether each secret is present, never its value.            */

import { book, env, fileSources, json } from './_lib.js';

export default function handler(req, res) {
  const sources = fileSources();
  const needed = [...new Set(book.editions.flatMap((e) => e.files || []))];

  json(res, 200, {
    checkoutMode: book.checkout?.mode || 'demo',
    stripe: {
      secretKey: Boolean(env('STRIPE_SECRET_KEY')),
      webhookSecret: Boolean(env('STRIPE_WEBHOOK_SECRET')),
    },
    email: {
      resendKey: Boolean(env('RESEND_API_KEY')),
      from: Boolean(env('MAIL_FROM')),
    },
    downloads: {
      secret: Boolean(env('DOWNLOAD_SECRET')),
      filesDeclared: needed,
      filesConfigured: needed.filter((key) => Boolean(sources[key])),
      missing: needed.filter((key) => !sources[key]),
    },
  });
}
