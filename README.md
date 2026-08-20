# The Confused Bookstore

A single-book sales platform disguised as a physics-based dream library.

One page, six movements, one book: **_How to Bag a Billionaire's Daughter — A Field
Manual for the Alpha Acquirer_** by Chadwick P. Worthington III, Founder of the
Alpha Acquirer Institute. The book, the author and the Institute are fiction —
this is a satire, and the checkout is a demonstration that takes no payment
details of any kind.

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
| 05 | **The Purchase Portal** | The book returns, life-sized. The price does not discount; it quotes literature. The checkout is styled as a library card. |
| — | **The Void** | There is no footer. Footers imply an ending. |

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
src/
  main.js                boot sequence, the single rAF loop, lazy section init
  core/
    palette.js           the eight colours, in one place
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

## Browser support

Modern evergreen browsers with WebGL2. Chromium, Firefox and Safari on desktop;
iOS and Android on mobile with the reduced settings above.
