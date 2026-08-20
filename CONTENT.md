# Putting your book in the shop

Everything about the book — its title, author, cover, editions, prices, gallery
plates, statistics and whispers — lives in one file:

```
src/content/book.js
```

Edit that file, run `npm run dev`, and the whole site follows: the 3D cover and
spine, the headline, the page title and social card, the gallery, the manifesto,
and the purchase portal. **Swapping in a completely different book is a
one-file change.** Nothing else needs to be touched.

---

## 1. The book itself

```js
export const book = {
  title: 'The Quiet Machine',
  titleLines: ['The', 'Quiet', 'Machine'],   // how the headline breaks
  accentLine: 1,                              // which line is Rosewood
  subtitle: 'Notes on Building in Silence',
  author: 'R. Ellery Vance',
  authorRole: 'Sometime engineer',
  imprint: 'Low Hum Press',
  monogram: 'REV',                            // stamped on the crest and cover
  pages: 208,
  description: 'One sentence for search engines and link previews.',
  ...
};
```

`titleLines` is the headline exactly as you want it broken — two lines, five
lines, whatever suits the words. The same lines are foil-stamped on the 3D
cover, where the type steps down automatically if a line is long.

## 2. The cover

By default the cover is **drawn**: rosewood leather, gold foil, your title and
author. You do not have to supply any artwork at all.

To use your real cover instead:

1. Drop the file into `public/covers/` — say `public/covers/front.jpg`.
   Portrait, ideally 1000 × 1450 or larger. JPG, PNG or WebP.
2. Point the config at it:

```js
cover: {
  image: '/covers/front.jpg',        // note the leading slash
  spineImage: '/covers/spine.jpg',   // optional; tall and narrow, ~256 × 1024
},
```

The book renders immediately with the drawn cover and swaps to your artwork the
moment it loads, so nothing is ever missing while the page is starting up. An
uploaded cover is treated as ink on board rather than foil on leather — no
metal, no glow — so photographic covers look printed rather than plated.

## 3. Editions — including the audiobook

**Yes, you can sell the audiobook alongside the book.** Every entry in
`editions` becomes a chip in the purchase portal; picking one updates the price,
the caption under the 3D book, the running total and the checkout.

```js
defaultEdition: 'hardcover',

editions: [
  {
    id: 'hardcover',
    label: 'Hardcover',
    price: 34,
    tagline: 'Shown under the 3D book.',
    detail: 'Shown under the price.',
    links: { USD: '', GBP: '', EUR: '' },
  },
  {
    id: 'audiobook',
    label: 'Audiobook',
    price: 26,
    tagline: 'Eight hours, read by the author.',
    detail: 'Unabridged.',
    audio: {
      sample: '/audio/sample.mp3',   // null hides the player entirely
      duration: '8h 12m',
      narrator: 'Read by the author',
    },
    links: { USD: '', GBP: '', EUR: '' },
  },
],
```

Give the audiobook edition an `audio.sample` and a player appears: a play button
and a live waveform in Burnt Orange, driven by the Web Audio API. Put a short
clip — a minute or two — in `public/audio/`. MP3, M4A or WAV all work.

The sample runs on its own audio context, so it is not silenced by the site's
ambient-sound toggle, and it stops when the visitor switches to another edition.

Add, remove or reorder editions freely; two is fine, five is fine.

## 4. Prices and regions

The price is **one number, the same everywhere in the world**. Only the currency
symbol changes with the visitor's region:

| Region | Shows |
|---|---|
| United Kingdom | `£34.00` |
| Eurozone | `€34.00` |
| Everywhere else | `$34.00` |

`middleware.js` at the repo root is Vercel Edge Middleware. It reads the
country Vercel has already resolved for the request and leaves a `currency`
cookie; the page reads that cookie. Off Vercel — local dev, any other host — the
browser's own locale is used instead, and then USD.

Force one while you work by adding `?currency=GBP`, `?currency=EUR` or
`?currency=USD` to the URL.

To change which countries see which symbol, edit the `EURO_COUNTRIES` set — it
appears in both `middleware.js` and `src/core/currency.js`, and the two lists
are meant to match.

> **One thing to get right before you take money.** Showing `£34` and then
> charging `$34` is not a rounding difference — it is a different amount, and
> buyers notice. Give each currency its own payment link (below) so the symbol
> on the page is the currency actually charged.

## 5. Taking money and delivering the files

This is the part people get stuck on, so here it is in full. The button has
three modes, set in `src/content/book.js`:

```js
checkout: { mode: 'demo' },   // 'demo' | 'links' | 'stripe'
```

| Mode | What the button does | What you have to set up |
|---|---|---|
| `demo` | Validates, stamps a library card, takes nothing. The default. | Nothing |
| `links` | Sends the buyer to a checkout page you already have | One payment link per currency |
| `stripe` | This site creates the Stripe session **and emails the files itself** | Stripe + email keys, private file storage |

### The quick route — `links`

If you would rather not run any of this yourself, use a shop that handles
payment *and* file delivery: **Lemon Squeezy**, **Payhip**, **Gumroad** or
**Paddle**. Upload Volume I and Volume II there, price each edition, and paste
the resulting checkout URLs:

```js
checkout: { mode: 'links' },

editions: [
  {
    id: 'ebook',
    price: 18,
    links: {
      USD: 'https://yourshop.lemonsqueezy.com/checkout/buy/xxxx',
      GBP: 'https://yourshop.lemonsqueezy.com/checkout/buy/yyyy',
      EUR: 'https://yourshop.lemonsqueezy.com/checkout/buy/zzzz',
    },
  },
],
```

They take care of the money, the VAT, the receipt and the download email. This
is the honest recommendation for one person selling one book.

### The integrated route — `stripe`

The site takes the payment through Stripe and emails the files itself, using
three small functions in `api/`. No book file ever goes in this repository.

```
api/checkout.js      creates the Stripe Checkout session
api/webhook.js       Stripe calls it once the money moves → emails the links
api/download.js      hands over a file to a signed, expiring link
api/setup-check.js   tells you which of the pieces below are actually set
```

**Step 1 — put the files somewhere private.**
Vercel Blob, Cloudflare R2, Amazon S3, Backblaze B2 — anywhere that gives you a
URL you keep to yourself. Do **not** put them in `public/`: everything there is
downloadable by anyone who guesses the path.

**Step 2 — give each file a key, and map the keys to those URLs.**
The keys are yours to choose. Two volumes in two formats is four keys:

```js
// src/content/book.js
fileLabels: {
  'ebook-vol-1': 'Volume I — EPUB & PDF',
  'ebook-vol-2': 'Volume II — EPUB & PDF',
  'audiobook-vol-1': 'Volume I — Audiobook (M4B)',
  'audiobook-vol-2': 'Volume II — Audiobook (M4B)',
},

editions: [
  { id: 'ebook',     files: ['ebook-vol-1', 'ebook-vol-2'] },
  { id: 'audiobook', files: ['audiobook-vol-1', 'audiobook-vol-2'] },
  { id: 'bundle',    files: ['ebook-vol-1', 'ebook-vol-2', 'audiobook-vol-1', 'audiobook-vol-2'] },
  { id: 'hardcover', files: [] },   // arrives in a van, not an inbox
]
```

One purchase of the eBook edition therefore delivers **both volumes** — one link
each. Sell them separately instead by making Volume I and Volume II their own
editions with one file each.

**Step 3 — set the environment variables** in Vercel (Project → Settings →
Environment Variables). None of these belong in the repository:

| Variable | What it is |
|---|---|
| `STRIPE_SECRET_KEY` | `sk_live_…` (or `sk_test_…` while you are trying it) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…`, from the webhook endpoint you create in step 4 |
| `RESEND_API_KEY` | From [resend.com](https://resend.com) — the free tier is enough to start |
| `MAIL_FROM` | `Your Press <books@yourdomain.com>`, on a domain verified with Resend |
| `DOWNLOAD_SECRET` | Any long random string: `openssl rand -hex 32` |
| `BOOK_FILES` | JSON mapping your keys to the private URLs (below) |
| `SITE_URL` | Optional. `https://yourdomain.com`, if you do not want the request's own host used |

```json
{
  "ebook-vol-1": "https://your-bucket.r2.cloudflarestorage.com/vol-1.epub?…",
  "ebook-vol-2": "https://your-bucket.r2.cloudflarestorage.com/vol-2.epub?…",
  "audiobook-vol-1": "https://your-bucket.r2.cloudflarestorage.com/vol-1.m4b?…",
  "audiobook-vol-2": "https://your-bucket.r2.cloudflarestorage.com/vol-2.m4b?…"
}
```

**Step 4 — tell Stripe where to knock.** In the Stripe dashboard, Developers →
Webhooks → Add endpoint:

- URL: `https://yourdomain.com/api/webhook`
- Event: `checkout.session.completed`

Copy the signing secret it gives you into `STRIPE_WEBHOOK_SECRET`.

**Step 5 — switch the mode** to `'stripe'` in `src/content/book.js`, and deploy.

**Step 6 — check your work.** Open `https://yourdomain.com/api/setup-check`. It
reports which pieces are present — never their values — and, importantly, which
file keys are declared on an edition but missing from `BOOK_FILES`:

```json
{
  "checkoutMode": "stripe",
  "stripe": { "secretKey": true, "webhookSecret": true },
  "email": { "resendKey": true, "from": true },
  "downloads": { "secret": true, "filesDeclared": ["ebook-vol-1", "…"], "missing": [] }
}
```

**Step 7 — buy your own book.** With Stripe in test mode, card `4242 4242 4242
4242`, any future expiry, any CVC. You should get the email within seconds, and
each link should download the right file.

### What the buyer experiences

1. Picks an edition, fills in name, email and quantity, presses the button.
2. Goes to Stripe's own payment page, in their own currency.
3. Comes back to the site, which shows a stamped card: *Paid. Check your email.*
4. Gets an email from you with one link per file, valid for **30 days**.
5. Each link is signed against `DOWNLOAD_SECRET` — it cannot be guessed, edited
   or shared past its expiry — and redirects to the private file. The buyer
   never sees where the file actually lives.

If the email provider has a moment, the webhook returns an error and Stripe
retries, so a buyer who has paid always ends up with their book.

### Before you take real money

- Showing `£34` and charging `$34` is a different amount of money. Both routes
  charge in the currency shown, so keep it that way if you change them.
- Update `fineprint` in the config to describe your actual terms.
- Digital sales carry VAT/sales-tax obligations in most places. The hosted shops
  in the `links` route handle this for you as merchant of record; with Stripe it
  is yours to handle (Stripe Tax can do it).

## 6. The gallery

Each entry in `plates` becomes a plate in the spiral gallery, drawn on aged
paper. `kind` picks how it is drawn:

| `kind` | What it draws |
|---|---|
| `spread` | A two-page interior spread with a diagram. Takes `chapter`, `figure`, `caption`. |
| `portrait` | An author portrait using `author` and `authorRole`. Add `photo: '/gallery/you.jpg'` for a real one, fitted to the plate; leave it off for the drawn silhouette. |
| `napkin` | A monogrammed napkin. Takes `scrawl`, `number`, `label`. |
| `chart` | A two-line chart. Takes `seriesA`, `seriesB`. |
| `crest` | An institutional crest using `imprint` and `monogram`. Takes `motto`. |
| `errata` | A corrections page. Takes `items: [[page, note], …]`. |
| `image` | **Your own photograph.** Takes `image: '/gallery/whatever.jpg'`. |

Every plate needs `kicker`, `title` and `body` — they fill the pop-up modal.

For real photographs:

```js
{
  id: 'launch',
  kind: 'image',
  image: '/gallery/launch-night.jpg',
  kicker: 'Evidence A',
  title: 'Launch night',
  body: 'Shown in the modal when someone opens this plate.',
}
```

Drop the file in `public/gallery/`. It is fitted to the sheet, so any aspect
ratio works.

## 7. The manifesto, the whispers, the quotes

- `stats` — the numbers that count up. `value`, optional `suffix`, `label`, `note`.
- `pullquote` — the rotated line beside them.
- `whisperSeeds` — the whispers already drifting when someone arrives. Visitor
  whispers are stored in their own browser only; there is no server.
- `quotes` — `[text, attribution]` pairs shown when the price is hovered.

---

## Deploying to Vercel

```bash
npm install -g vercel
vercel            # first deploy, follow the prompts
vercel --prod
```

Or connect the GitHub repository at [vercel.com/new](https://vercel.com/new) and
push. Vercel detects Vite from `vercel.json`, builds to `dist/`, and picks up
`middleware.js` automatically — `@vercel/edge` is already a dependency.

After deploying, check the currency logic with the response headers:

```bash
curl -sI https://your-site.vercel.app/ | grep -i 'x-shop\|set-cookie'
# x-shop-region: GB
# x-shop-currency: GBP
# set-cookie: currency=GBP; Path=/; Max-Age=86400; SameSite=Lax
```

The middleware only runs on Vercel. Locally you will always see the locale-based
fallback, which is what `?currency=` is for.

---

## Checklist for a new book

- [ ] `title`, `titleLines`, `subtitle`, `author`, `authorRole`, `imprint`, `monogram`, `pages`, `description`
- [ ] Cover artwork in `public/covers/` (or leave it drawn)
- [ ] `editions` with real prices, and an audiobook sample in `public/audio/` if you have one
- [ ] Payment links per currency, or leave the demo checkout in place
- [ ] `plates` — rewrite the copy, or swap in photographs
- [ ] `checkout.mode`, and the files/keys/environment variables that go with it
- [ ] `stats`, `pullquote`, `whisperSeeds`, `quotes`
- [ ] `fineprint` — say what is actually true about your checkout
