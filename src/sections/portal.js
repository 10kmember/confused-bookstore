import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { createStage } from '../three/stage.js';
import { BookController, createBook, createHalo } from '../three/book.js';
import { drawFlatBook } from '../three/flatBook.js';
import { audio } from '../core/audio.js';
import { smoothScroll } from '../core/smoothScroll.js';
import { book, edition } from '../content/book.js';
import { CURRENCIES, currency, format, parts } from '../core/currency.js';
import { P, rgba } from '../core/palette.js';
import { fitCanvas } from '../util/env.js';
import { clamp, pick } from '../util/math.js';

/* ═══════════════ 05 — THE PURCHASE PORTAL ═══════════════ */

export function initPortal() {
  const canvas = document.getElementById('portal-webgl');
  canvas.dataset.grab = '';
  const stage = createStage(canvas, { fov: 30 });
  let bookMesh = null;
  let halo = null;
  let controller = null;

  if (stage) {
    bookMesh = createBook({ scale: 1.05 });
    halo = createHalo({ opacity: 0.07, size: 3.2 });
    halo.position.z = -1.2;
    stage.scene.add(bookMesh, halo);
    stage.camera.position.z = 5.4;
    if (stage.fx) stage.fx.uVignette.value = 0.75;

    controller = new BookController(bookMesh, canvas, { stiffness: 22 });
    controller.onThrow = (force) => audio.thud(0.3 + force * 0.5);

    gsap.from(bookMesh.position, {
      y: -2.4,
      duration: 1.6,
      ease: 'power3.out',
      scrollTrigger: { trigger: canvas, start: 'top 80%', once: true },
    });
  } else {
    // Without WebGL the shop still has to work: the cover goes on flat, and
    // everything that sells the book carries on unchanged.
    drawFlatBook(canvas, { night: true });
  }

  /* ── which edition ─────────────────────────────────────────────────────
     Hardcover, eBook, audiobook, bundle — whatever src/content/book.js
     declares. The price is the same number in every country; only the symbol
     changes with the visitor's region (see core/currency.js).             */

  const editionsEl = document.getElementById('editions');
  const detailEl = document.getElementById('edition-detail');
  const captionEl = document.getElementById('portal-caption');
  const fineprintEl = document.getElementById('checkout-fineprint');
  const totalEl = document.getElementById('checkout-total');
  const cta = document.querySelector('.btn--cta');
  const ctaLabel = cta.textContent.trim();
  const notice = document.getElementById('edition-notice');

  let current = edition(book.defaultEdition);

  // The chips ship in the HTML (see the build plugin) so the shop is readable
  // without JavaScript. All that is added here is behaviour, and the visitor's
  // own currency in place of the listed one.
  book.editions.forEach((item) => {
    const input = editionsEl.querySelector(`input[value="${item.id}"]`);
    if (!input) return;
    const chip = input.closest('.edition');
    chip.querySelector('.edition__price').textContent = format(item.price, { cents: false });
    input.addEventListener('change', () => {
      select(item.id);
      audio.rustle(0.6);
    });
  });

  /** The payment link for this edition in this visitor's currency, if any. */
  const paymentLink = (item) => item.links?.[currency()]?.trim() || '';

  /** 'stripe' when this site handles payment itself, 'links' for a hosted
      payment page, 'demo' when it takes no money at all. */
  const mode = () => {
    const declared = book.checkout?.mode || 'demo';
    if (declared === 'links') return paymentLink(current) ? 'links' : 'demo';
    return declared;
  };

  /** Anything an author has not finished yet. */
  const ready = (item) => item.available !== false;

  function select(id) {
    current = edition(id);
    const price = parts(current.price);

    document.getElementById('price-currency').textContent = price.symbol;
    document.getElementById('price-value').textContent = price.whole;
    document.getElementById('price-cents').textContent = price.cents;

    detailEl.textContent = current.detail || '';
    captionEl.textContent = current.tagline || '';

    // An edition that is not ready says so, and points at one that is, rather
    // than taking money for something nobody can send.
    const alternative = edition(current.availability?.suggest);
    const suggesting = !ready(current) && alternative && ready(alternative) && alternative.id !== current.id;

    document.getElementById('portal').classList.toggle('is-unavailable', !ready(current));
    notice.hidden = ready(current);
    if (!ready(current)) {
      notice.querySelector('.notice__text').textContent =
        current.availability?.note || 'This edition is not ready yet.';
      const swap = notice.querySelector('.notice__swap');
      swap.hidden = !suggesting;
      if (suggesting) {
        swap.textContent = `Take the ${alternative.label} instead — ${format(alternative.price, { cents: false })}`;
        swap.onclick = () => {
          const input = editionsEl.querySelector(`input[value="${alternative.id}"]`);
          if (input) {
            input.checked = true;
            select(alternative.id);
            audio.chime();
          }
        };
      }
    }

    cta.disabled = !ready(current);
    cta.textContent = ready(current) ? ctaLabel : 'Not ready yet';

    const delivered = current.files?.length;
    fineprintEl.textContent =
      (!ready(current) && (current.availability?.note ? 'Nothing is charged for an edition that is not finished.' : null)) ||
      {
        stripe: delivered
          ? `Paid in ${CURRENCIES[currency()].label} through Stripe. ${delivered === 1 ? 'The file lands' : 'The files land'} in your inbox the moment the payment clears.`
          : `Paid in ${CURRENCIES[currency()].label} through Stripe. We will email you to arrange delivery.`,
        links: `Checkout is handled by the payment provider, in ${CURRENCIES[currency()].label}. You will be handed over when you are ready.`,
        demo: book.fineprint,
      }[mode()] || book.fineprint;

    sample.attach(current);
    updateTotal();
  }

  /* ── the running total ─────────────────────────────────────────────── */

  const copies = document.getElementById('co-copies');
  const count = () => clamp(Math.trunc(Number(copies.value) || 1), 1, 13);
  const updateTotal = () => {
    const n = count();
    totalEl.textContent = `${n} ${n === 1 ? 'copy' : 'copies'} · ${format(current.price * n)}`;
  };
  copies.addEventListener('input', updateTotal);

  /* ── the audiobook sample ──────────────────────────────────────────────
     Its own AudioContext, deliberately: the ambient drone lives behind a mute
     the visitor controls, and a sample they pressed play on must not be
     silenced by it.                                                        */

  const sample = createSamplePlayer();

  /* ── the price quotes literature, never a discount ─────────────────── */

  const price = document.getElementById('price');
  const quote = document.getElementById('price-quote');
  const showQuote = () => {
    const [text, who] = pick(book.quotes);
    quote.textContent = `“${text}” — ${who}`;
    gsap.fromTo(quote, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(price, { rotate: -1.5 }, { rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };
  price.addEventListener('pointerenter', showQuote);
  price.addEventListener('focus', showQuote);

  /* ── checkout ──────────────────────────────────────────────────────── */

  const form = document.getElementById('checkout');
  const receipt = document.getElementById('receipt');
  const receiptLine = document.getElementById('receipt-line');

  const invalidate = (field) => {
    field.classList.add('is-invalid');
    field.classList.remove('is-shaking');
    void field.offsetWidth;
    field.classList.add('is-shaking');
    setTimeout(() => field.classList.remove('is-shaking'), 520);
  };

  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('is-invalid'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!ready(current)) {
      audio.thud(0.4);
      notice.classList.remove('is-shaking');
      void notice.offsetWidth;
      notice.classList.add('is-shaking');
      return;
    }
    const name = form.querySelector('#co-name');
    const email = form.querySelector('#co-email');

    let ok = true;
    if (!name.value.trim()) {
      invalidate(name.closest('.field'));
      ok = false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())) {
      invalidate(email.closest('.field'));
      ok = false;
    }
    const n = Number(copies.value);
    if (!Number.isFinite(n) || n < 1 || n > 13) {
      invalidate(copies.closest('.field'));
      ok = false;
    }
    if (!ok) {
      audio.thud(0.4);
      return;
    }

    audio.chime();

    // Three ways this can end: our own Stripe session, someone else's hosted
    // checkout, or the honest demonstration.
    if (mode() === 'links') {
      const url = new URL(paymentLink(current));
      url.searchParams.set('quantity', String(count()));
      if (email.value.trim()) url.searchParams.set('prefilled_email', email.value.trim());
      sample.stop();
      window.location.assign(url.toString());
      return;
    }

    if (mode() === 'stripe') {
      startStripeCheckout({ email: email.value.trim(), quantity: count() });
      return;
    }

    receiptLine.textContent = `${count()} × ${current.label} · ${format(current.price * count())} · for ${name.value.trim()}`;
    receipt.classList.add('is-open');
    receipt.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    gsap.fromTo(
      receipt.querySelector('.receipt__stamp'),
      { scale: 2.4, opacity: 0, rotate: -24 },
      { scale: 1, opacity: 0.85, rotate: -6, duration: 0.7, ease: 'back.out(2)' }
    );
    // spin the book in celebration of a purchase that never happened
    if (controller) controller.angVel.y += 9;
  });

  /** Ask our own function for a Checkout session, then go there. */
  async function startStripeCheckout({ email, quantity }) {
    const button = cta;
    button.disabled = true;
    button.textContent = 'One moment…';
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ editionId: current.id, quantity, email, currency: currency() }),
      });
      const body = await response.text();
      let data = {};
      try {
        data = JSON.parse(body);
      } catch {
        // A missing or misconfigured function answers with HTML, not JSON.
        throw new Error(
          response.status === 404
            ? 'the checkout service is not deployed'
            : `the checkout service answered with ${response.status}`
        );
      }
      if (!response.ok || !data.url) throw new Error(data.error || 'checkout could not be started');
      sample.stop();
      window.location.assign(data.url);
    } catch (error) {
      console.error(error);
      button.disabled = false;
      button.textContent = ctaLabel;
      fineprintEl.textContent = `Checkout is not available right now — ${error.message}. Nothing has been charged.`;
      audio.thud(0.5);
    }
  }

  /**
   * Stripe sends the buyer back here when it is done with them. Called by the
   * boot sequence rather than on init, so the receipt does not open behind the
   * loading screen.
   */
  function greetReturningBuyer() {
    const status = new URLSearchParams(location.search).get('purchase');
    if (!status) return;
    history.replaceState(null, '', location.pathname);

    if (status === 'success') {
      receiptLine.textContent = 'Paid. Check your email — your download links are on their way.';
      receipt.classList.add('is-open');
      receipt.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      gsap.fromTo(
        receipt.querySelector('.receipt__stamp'),
        { scale: 2.4, opacity: 0, rotate: -24 },
        { scale: 1, opacity: 0.85, rotate: -6, duration: 0.7, ease: 'back.out(2)' }
      );
      smoothScroll.toElement(document.getElementById('portal'), -1);
    } else if (status === 'cancelled') {
      fineprintEl.textContent = 'Nothing was charged. The book is still here when you want it.';
    }
  }

  const closeReceipt = () => {
    receipt.classList.remove('is-open');
    receipt.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  };
  document.getElementById('receipt-close').addEventListener('click', closeReceipt);
  receipt.addEventListener('click', (e) => e.target === receipt && closeReceipt());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeReceipt());

  cta.textContent = ctaLabel;
  select(current.id);

  let last = performance.now();
  return {
    greetReturningBuyer,
    frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      sample.draw();
      if (!stage || !stage.visible) return;
      if (!controller.dragging) controller.angVel.y += 0.02 * dt * 60;
      controller.update(dt);
      halo.position.set(bookMesh.position.x, bookMesh.position.y, bookMesh.position.z - 1.2);
      stage.render(now / 1000);
    },
  };
}

/**
 * A minute of the audiobook, with a waveform in Burnt Orange. The player only
 * appears for an edition that actually has a sample file on it.
 */
function createSamplePlayer() {
  const root = document.getElementById('sample');
  const button = document.getElementById('sample-play');
  const label = button.querySelector('.sample__label');
  const meta = document.getElementById('sample-meta');
  const canvas = document.getElementById('sample-wave');
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  let element = null;
  let analyser = null;
  let context = null;
  let data = null;
  let playing = false;

  const resize = () => ({ w: W, h: H } = fitCanvas(canvas, ctx));
  window.addEventListener('resize', () => root.hidden || resize());

  function ensureGraph() {
    if (analyser) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    context = new Ctx();
    analyser = context.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.75;
    data = new Uint8Array(analyser.frequencyBinCount);
    context.createMediaElementSource(element).connect(analyser).connect(context.destination);
  }

  function setPlaying(state) {
    playing = state;
    button.setAttribute('aria-pressed', String(state));
    button.classList.toggle('is-playing', state);
    label.textContent = state ? 'Stop listening' : 'Hear a minute of it';
  }

  button.addEventListener('click', async () => {
    if (!element) return;
    if (playing) {
      element.pause();
      setPlaying(false);
      return;
    }
    ensureGraph();
    if (context?.state === 'suspended') await context.resume();
    try {
      await element.play();
      setPlaying(true);
    } catch {
      meta.textContent = 'The sample could not be played.';
    }
  });

  return {
    /** Point the player at an edition, or hide it if that edition has no sample. */
    attach(item) {
      const source = item.audio?.sample;
      if (!source) {
        this.stop();
        root.hidden = true;
        return;
      }
      if (!element || element.getAttribute('src') !== source) {
        this.stop();
        element = element || new Audio();
        element.preload = 'none';
        element.setAttribute('src', source);
        element.addEventListener('ended', () => setPlaying(false));
      }
      meta.textContent = [item.audio.duration, item.audio.narrator].filter(Boolean).join(' · ');
      root.hidden = false;
      resize();
    },

    stop() {
      if (element && !element.paused) element.pause();
      if (playing) setPlaying(false);
    },

    draw() {
      if (root.hidden || !W) return;
      ctx.clearRect(0, 0, W, H);

      const bars = 56;
      const gap = 2;
      const barWidth = (W - gap * (bars - 1)) / bars;
      if (playing && analyser) analyser.getByteFrequencyData(data);

      for (let i = 0; i < bars; i++) {
        // A resting waveform still says "this is audio", so silence gets a
        // gentle standing wave rather than a flat line.
        const idle = 0.12 + Math.sin(i * 0.5 + performance.now() / 900) * 0.05;
        // Voice lives in the bottom few kHz, so the bars map across the low
        // bins rather than the whole spectrum — otherwise speech would only
        // ever wiggle the leftmost sliver of the meter.
        const bin = Math.floor(Math.pow(i / bars, 1.35) * Math.min(120, data?.length ?? 120));
        const level = playing && analyser ? data[bin] / 255 : idle;
        const h = Math.max(2, level * H * 0.92);
        ctx.fillStyle = rgba(playing ? P.ember : P.slate, playing ? 0.85 : 0.35);
        ctx.beginPath();
        ctx.roundRect(i * (barWidth + gap), (H - h) / 2, barWidth, h, barWidth / 2);
        ctx.fill();
      }
    },
  };
}
