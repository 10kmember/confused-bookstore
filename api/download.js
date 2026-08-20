/* GET /api/download?t=… — hand over a file to someone who paid for it. */

import { fileSources, json, verifyDownload } from './_lib.js';

export default async function handler(req, res) {
  const token = new URL(req.url, 'http://localhost').searchParams.get('t');
  const fileKey = verifyDownload(token);

  if (!fileKey) {
    return json(res, 403, { error: 'This link is not valid, or has expired. Reply to your receipt and we will send a fresh one.' });
  }

  const source = fileSources()[fileKey];
  if (!source) {
    console.error(`No source configured for "${fileKey}" — check BOOK_FILES.`);
    return json(res, 404, { error: 'That file is not available yet.' });
  }

  // The private location never reaches the buyer; only this signed link does.
  res.setHeader('cache-control', 'private, no-store');
  res.redirect(302, source);
}
