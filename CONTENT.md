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

## 5. Taking real payments

Out of the box the checkout is a demonstration: it validates, stamps a library
card and takes no payment details. To make it real, put a payment link in the
edition's `links`:

```js
links: {
  USD: 'https://buy.stripe.com/xxxxxxxxxxxx',
  GBP: 'https://buy.stripe.com/yyyyyyyyyyyy',
  EUR: 'https://buy.stripe.com/zzzzzzzzzzzz',
},
```

Any provider that gives you a hosted checkout URL works — Stripe Payment Links,
Lemon Squeezy, Paddle, Gumroad, Shopify. When a link exists for the selected
edition and the visitor's currency, the form validates and then hands them to
the provider with the quantity and email attached. When it does not, the
demonstration receipt appears instead. The fine print under the button changes
to match, so the page never claims to take money it cannot take.

Create one product per edition per currency in your provider, priced at the same
number in each currency.

### Where the actual book file goes

**Not in this repository.** Anything in `public/` is downloadable by anyone who
guesses the URL, so a PDF, EPUB or M4B placed there is simply free. Upload the
file to your payment provider's digital-delivery feature instead — Stripe, Lemon
Squeezy, Paddle and Gumroad all email the file (or a signed link) after payment.
This site's job is the shop window; the provider's job is the vault.

The only audio that belongs in `public/audio/` is the **sample**.

## 6. The gallery

Each entry in `plates` becomes a plate in the spiral gallery, drawn on aged
paper. `kind` picks how it is drawn:

| `kind` | What it draws |
|---|---|
| `spread` | A two-page interior spread with a diagram. Takes `chapter`, `figure`, `caption`. |
| `portrait` | An author portrait using `author` and `authorRole`. |
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
- [ ] `stats`, `pullquote`, `whisperSeeds`, `quotes`
- [ ] `fineprint` — say what is actually true about your checkout
