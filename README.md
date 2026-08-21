# The Confused Bookstore

A single-book sales platform disguised as a physics-based dream library.

One page, six movements, one book: **_How to Bag a Billionaire's Daughter — A Field
Manual for the Alpha Acquirer_** by Chadwick P. Worthington III, Founder of the
Alpha Acquirer Institute. The book, the author and the Institute are fiction —
this is a satire, and the checkout is a demonstration that takes no payment
details of any kind.

**Selling your own book here is a one-file change** — title, cover, editions,
prices, gallery and all. See [CONTENT.md](CONTENT.md).

```bash
npm install
npm run dev      # vite dev server
npm run build    # static bundle in dist/
npm run preview  # serve the built bundle
```

The output in `dist/` is a static site: any file host will do.

---

## The journey

| # | Section | What happens |
|---|---------|--------------|
| 00 | **The Threshold** | A particle network drifts and flinches from the cursor. The book is a real Three.js object with foil-stamped leather — drag it, throw it, it always comes home. |
| 01 | **The Spiral Gallery** | Interior spreads, field photographs and evidence, laid out on a golden-angle spiral that turns as the section is pinned. Plates open like pop-up books. |
| 02 | **The Physics Reading Room** | A Rapier 2D desk. Click to detonate, drag to relocate, invert gravity, make it rain. The book at the centre is heavier than everything else and magnetically attached to the middle. |
| 03 | **The Confused Manifesto** | Numbered statistics, counted up on scroll, stated with total confidence and no evidence. The page turns to night here. |
| 04 | **The Whisper Wall** | Sixty characters at a time, drifting upward through a projected z-space until they come apart into their own letters. |
| 05 | **The Purchase Portal** | The book returns, life-sized. Hardcover, eBook, audiobook or all three — the audiobook brings a sample player with a live waveform. The price does not discount; it quotes literature. The checkout is styled as a library card. |
| — | **The Void** | There is no footer. Footers imply an ending. |

---

## Selling a book

The whole shop is driven by `src/content/book.js`: identity, cover artwork,
editions, prices, gallery plates, statistics, whispers and quotes. Point it at a
different book and the 3D cover, the headline, the page title, the gallery and
the checkout all follow.

**Editions.** Anything you list — hardcover, eBook, audiobook, a bundle — becomes
a chip in the purchase portal. An edition with an `audio.sample` gets a player
with a Burnt Orange waveform, running on its own audio context so the ambient
mute never silences it.

**One price, every region.** The number is identical worldwide; only the symbol
changes — `£34` in the UK, `€34` in the eurozone, `$34` everywhere else.
`middleware.js` is Vercel Edge Middleware that reads the request's country and
leaves a `currency` cookie; off Vercel the browser's locale is used instead.
Append `?currency=GBP` to any URL to force one.

**Findable.** Every build writes `robots.txt`, `sitemap.xml`, `llms.txt`, a web
manifest, `humans.txt` and — when a contact address is configured —
`security.txt`, all generated from the same book data as the page, alongside
schema.org `Book` markup and canonical/Open Graph tags.

**Real payments and delivery.** The button has three modes. `demo` takes
nothing. `links` hands the buyer to a checkout you already run. `stripe` sells
the book from here: four small functions in `api/` create the Stripe session,
verify the webhook, and email the buyer a signed, expiring download link for
every file in that edition — both volumes, both formats, whatever the edition
declares. The files themselves live in private storage named by environment
variable, never in this repository. `/api/setup-check` reports which pieces are
configured. See [CONTENT.md](CONTENT.md) for the full walkthrough.

---

## Design system

| Role | Colour | |
|---|---|---|
| Primary background | `#F1ECE6` | Alabaster Cream |
| Secondary background | `#DDD5CD` | Warm Greige |
| Primary text | `#2E2E2E` | Charcoal Espresso |
| Hero accent | `#7D4047` | Vintage Rosewood |
| Premium highlight | `#F4B044` | Warm Gold |
| Mystery depth | `#112532` | Dark Blue |
| Energy pop | `#E0680E` | Burnt Orange |
| Ethereal cool | `#88A5B7` | Light Slate Blue |

Display type is **Amatic SC**, body and UI **Nunito** — both self-hosted under the
SIL Open Font License (licences in `src/assets/fonts/`). They are not loaded from
a CDN on purpose: the book cover, the gallery plates and the physics props are
drawn into canvases, and a canvas cannot repaint itself when a webfont arrives
late.

**No image assets ship with this site.** Leather grain, gold foil, page edges,
book spreads, the author portrait, the Institute crest and the errata page are
all generated on a 2D canvas at runtime.

---

## Architecture

```
index.html               markup for all six sections and the chrome
middleware.js            Vercel Edge Middleware: region → currency cookie
vercel.json              build settings and cache headers
api/                     checkout, Stripe webhook, signed downloads, setup check
src/
  content/book.js        THE BOOK — the only file you edit to sell another one
  content/wellKnown.js   robots, sitemap, llms.txt and friends, written from it
  main.js                boot sequence, the single rAF loop, lazy section init
  core/
    palette.js           the eight colours, in one place
    currency.js          which symbol this visitor sees
    smoothScroll.js      eased native scrolling (see "Deviations")
    cursor.js            the quill and its gold trail
    audio.js             the library at midnight, synthesised
    loader.js            a stack of books falling into place
    chrome.js            menu, section rail, progress, mood, sound toggle
    modal.js             the pop-up book
    lottieIcons.js       hand-authored Lottie data for two icons
  sections/              one module per movement; each returns a frame() or null
  three/
    stage.js             renderer, lighting, post-processing, visibility pausing
    book.js              the book's geometry and its throw/return physics
    textures.js          every procedural surface
    genjutsu.js          chromatic aberration + pixel sorting + vignette, one pass
  util/                  capability detection, small maths, gallery artwork
  styles/                fonts, foundations, section layouts
```

Some notes on how it is put together:

- **One clock.** Every animated system exposes `frame(now)` and is driven from a
  single `gsap.ticker` callback, so there is exactly one rAF loop on the page.
- **Nothing runs off screen.** Each WebGL stage and canvas pauses when its
  element leaves the viewport.
- **Below the fold is lazy.** The purchase portal builds its WebGL stage, and
  Rapier fetches its ~2 MB of WebAssembly, only when the visitor gets near.
- **Frame-rate independence.** Springs and damping are expressed per second, not
  per frame; the physics world catches up to real time with a bounded
  accumulator. A book on a 30 fps laptop settles like one on a 144 Hz monitor.
- **Content is poured in at build time.** A small Vite plugin writes the book's
  title, byline and price into `index.html`, so the markup that ships is already
  correct for search engines and social cards and no visitor sees the wrong book
  flash past before the JavaScript arrives.

---

## Deviations from the brief

Each of these was a deliberate trade, not an omission:

- **GSAP ScrollSmoother → a custom smooth scroll.** ScrollSmoother is a paid GSAP
  Club plugin. `core/smoothScroll.js` keeps the *native* scroll position
  authoritative and eases it toward a virtual target, so ScrollTrigger, anchors,
  keyboard navigation and accessibility tooling all keep working.
- **Howler.js → the Web Audio API.** Every sound is synthesised: a two-oscillator
  drone under a slow filter sweep, band-passed noise for wind, filtered noise
  bursts for paper, an additive bell for the call to action. No audio files, and
  nothing plays until the visitor asks for it.
- **Rapier where it earns its weight.** The Reading Room is genuine Rapier 2D. The
  hero and portal books use a small quaternion integrator with a magnetic spring
  instead — they never collide with anything, and a second WebAssembly payload
  for one object is not a good trade. The loading screen's falling stack is
  likewise hand-integrated so that nothing blocks first paint.
- **Lottie for two icons.** The sound toggle and the whisper flag are hand-authored
  Bodymovin data (`core/lottieIcons.js`). The rest of the micro-animation is CSS
  and GSAP, which is lighter and easier to keep on-palette.
- **WebGL2, not WebGPU/TSL.** Compatibility beats novelty for a page whose entire
  job is to be seen.
- **The whisper wall is device-local.** Whispers live in `localStorage`; there is
  no backend and nothing is transmitted.

---

## When the browser says no

Privacy browsers block things. Tor's Safer mode switches off WebGL and
WebAssembly; canvas readback is refused; corporate machines have no GPU. The
site is built so none of that is fatal:

- **Every section starts independently.** One throwing does not stop the
  others, and a section that throws mid-frame is retired rather than allowed to
  break the animation loop for everything after it.
- **No WebGL** → the cover is drawn flat on a 2D canvas, beside the headline
  exactly where the 3D one sat, and the shop carries on unchanged.
- **No WebAssembly** → the reading room says so on its own readout.
- **No Web Audio** → the sound toggle simply does nothing.
- **No JavaScript at all** → the loading screen lifts, the runtime-built
  sections stand down, and the book, the price, the editions and the checkout
  are all in the HTML that shipped, because they are rendered at build time.

Verified by loading the site with each capability removed in turn.

## Accessibility and degradation

- `prefers-reduced-motion` is honoured: tweens resolve instantly, the custom
  cursor is disabled, and the ambient canvases are painted once and left still.
- Touch devices keep their native momentum scrolling; the spiral collapses into a
  single column; the physics room spawns fewer props and swaps drag for
  tap-to-blast.
- Sound is off until the toggle is pressed, everywhere.
- The modal traps nothing it should not: Escape closes it, focus returns to the
  plate that opened it, and it closes even if its animation stalls.
- Keyboard scrolling, focus rings and reduced-motion paths were all part of the
  build rather than an afterthought — though this is an experimental piece, and a
  screen-reader-first experience it is not.

## Deploying

```bash
vercel --prod        # or connect the repo at vercel.com/new
```

Vercel reads `vercel.json`, builds with Vite to `dist/`, and picks up
`middleware.js` automatically. Any static host works too — you simply lose the
region detection and fall back to the browser's locale.

## Browser support

Modern evergreen browsers with WebGL2. Chromium, Firefox and Safari on desktop;
iOS and Android on mobile with the reduced settings above.
