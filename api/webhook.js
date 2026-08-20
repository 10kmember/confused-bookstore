/* POST /api/webhook — Stripe calls this once the money has actually moved. */

import { book, edition, env, json, rawBody, sendEmail, signDownload, verifyStripeSignature } from './_lib.js';

// Stripe signs the bytes it sent, so nothing may parse them first.
export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'POST only' });

  const raw = await rawBody(req);
  if (!verifyStripeSignature(raw, req.headers['stripe-signature'])) {
    return json(res, 400, { error: 'Bad signature' });
  }

  const event = JSON.parse(raw.toString('utf8'));
  if (event.type !== 'checkout.session.completed') return json(res, 200, { received: true });

  const session = event.data.object;
  const to = session.customer_details?.email || session.customer_email;
  const item = edition(session.metadata?.editionId);

  try {
    if (!to) throw new Error('No email address on the completed session');

    const files = item?.files || [];
    const origin = env('SITE_URL', `https://${req.headers['x-forwarded-host'] || req.headers.host}`).replace(/\/$/, '');

    const links = files.map((key) => ({
      key,
      label: book.fileLabels?.[key] || key,
      url: `${origin}/api/download?t=${encodeURIComponent(signDownload(key, session.id))}`,
    }));

    await sendEmail({
      to,
      subject: links.length
        ? `Your copy of ${book.title}`
        : `Thank you — ${book.title}`,
      text: plainText(item, links),
      html: html(item, links),
    });

    return json(res, 200, { received: true, delivered: links.length });
  } catch (error) {
    // A 500 tells Stripe to retry, which is what we want: the buyer has paid
    // and must end up with their book even if the mail provider had a moment.
    console.error('delivery failed', error);
    return json(res, 500, { error: 'Delivery failed' });
  }
}

function plainText(item, links) {
  const lines = [
    `Thank you for buying ${book.title}.`,
    '',
    `Edition: ${item?.label || 'your copy'}`,
    '',
  ];
  if (links.length) {
    lines.push('Your download links (valid for 30 days):', '');
    links.forEach((link) => lines.push(`${link.label}: ${link.url}`));
  } else {
    lines.push('Your order is confirmed. A physical copy will be sent to you.');
  }
  lines.push('', `— ${book.imprint}`);
  return lines.join('\n');
}

function html(item, links) {
  const rows = links
    .map(
      (link) => `
        <tr><td style="padding:8px 0">
          <a href="${link.url}" style="color:#7D4047;font-weight:700;text-decoration:none">
            ${escape(link.label)} &rarr;
          </a>
        </td></tr>`
    )
    .join('');

  return `<!doctype html>
<html><body style="margin:0;background:#F1ECE6;font-family:ui-rounded,'Segoe UI',system-ui,sans-serif;color:#2E2E2E">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px">
    <tr><td align="center">
      <table role="presentation" width="100%" style="max-width:520px;background:#DDD5CD;border-top:18px solid #7D4047;border-radius:4px">
        <tr><td style="padding:28px">
          <p style="margin:0 0 6px;font-size:11px;letter-spacing:.28em;text-transform:uppercase;color:#7D4047;font-weight:700">Checked out</p>
          <h1 style="margin:0 0 4px;font-size:24px;line-height:1.2">${escape(book.title)}</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#5c5c5c">${escape(item?.label || 'Your copy')}</p>
          ${
            links.length
              ? `<p style="margin:0 0 8px;font-size:14px">Here it is. These links work for 30 days — save the files somewhere safe.</p>
                 <table role="presentation">${rows}</table>`
              : `<p style="margin:0;font-size:14px">Your order is confirmed. A physical copy is on its way.</p>`
          }
          <p style="margin:24px 0 0;font-size:12px;color:#6b6b6b">— ${escape(book.imprint)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

const escape = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
