import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { createStage } from '../three/stage.js';
import { BookController, createBook, createHalo } from '../three/book.js';
import { audio } from '../core/audio.js';
import { pick } from '../util/math.js';

/* ═══════════════ 05 — THE PURCHASE PORTAL ═══════════════ */

/** Hovering the price offers no discount. It offers literature. */
const QUOTES = [
  ['Confusion is a word we have invented for an order which is not understood.', 'Henry Miller'],
  ['Doubt is not a pleasant condition, but certainty is absurd.', 'Voltaire'],
  ['The only true wisdom is in knowing you know nothing.', 'Socrates'],
  ['A book must be the axe for the frozen sea within us.', 'Franz Kafka'],
  ['Not all those who wander are lost.', 'J. R. R. Tolkien'],
  ['The whole problem with the world is that fools are always so certain of themselves.', 'Bertrand Russell'],
  ['Confusion of goals and perfection of means seems to characterise our age.', 'Albert Einstein'],
];

export function initPortal() {
  const canvas = document.getElementById('portal-webgl');
  canvas.dataset.grab = '';
  const stage = createStage(canvas, { fov: 30 });
  const book = createBook({ scale: 1.05 });
  const halo = createHalo({ opacity: 0.07, size: 3.2 });
  halo.position.z = -1.2;
  stage.scene.add(book, halo);
  stage.camera.position.z = 5.4;
  if (stage.fx) stage.fx.uVignette.value = 0.75;

  const controller = new BookController(book, canvas, { stiffness: 22 });
  controller.onThrow = (force) => audio.thud(0.3 + force * 0.5);

  gsap.from(book.position, {
    y: -2.4,
    duration: 1.6,
    ease: 'power3.out',
    scrollTrigger: { trigger: canvas, start: 'top 80%', once: true },
  });

  /* ── price ───────────────────────────────────────────── */
  const price = document.getElementById('price');
  const quote = document.getElementById('price-quote');
  const showQuote = () => {
    const [text, who] = pick(QUOTES);
    quote.textContent = `“${text}” — ${who}`;
    gsap.fromTo(quote, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
    gsap.fromTo(price, { rotate: -1.5 }, { rotate: 0, duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  };
  price.addEventListener('pointerenter', showQuote);
  price.addEventListener('focus', showQuote);

  /* ── checkout ────────────────────────────────────────── */
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
    const name = form.querySelector('#co-name');
    const email = form.querySelector('#co-email');
    const copies = form.querySelector('#co-copies');

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
    const total = (n * 34).toFixed(2);
    receiptLine.textContent = `${n} ${n === 1 ? 'copy' : 'copies'} · $${total} · for ${name.value.trim()}`;
    receipt.classList.add('is-open');
    receipt.setAttribute('aria-hidden', 'false');
    document.body.classList.add('is-locked');
    gsap.fromTo(
      receipt.querySelector('.receipt__stamp'),
      { scale: 2.4, opacity: 0, rotate: -24 },
      { scale: 1, opacity: 0.85, rotate: -6, duration: 0.7, ease: 'back.out(2)' }
    );
    // spin the book in celebration of a purchase that never happened
    controller.angVel.y += 9;
  });

  const closeReceipt = () => {
    receipt.classList.remove('is-open');
    receipt.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
  };
  document.getElementById('receipt-close').addEventListener('click', closeReceipt);
  receipt.addEventListener('click', (e) => e.target === receipt && closeReceipt());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && closeReceipt());

  let last = performance.now();
  return {
    frame(now) {
      const dt = (now - last) / 1000;
      last = now;
      if (!stage.visible) return;
      if (!controller.dragging) controller.angVel.y += 0.02 * dt * 60;
      controller.update(dt);
      halo.position.set(book.position.x, book.position.y, book.position.z - 1.2);
      stage.render(now / 1000);
    },
  };
}
