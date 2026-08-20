import gsap from 'gsap';
import { P, rgba } from './palette.js';
import { fitCanvas, env } from '../util/env.js';
import { clamp, damp, rand, seeded } from '../util/math.js';

/**
 * The loading screen: a stack of books dropping into place.
 * Hand-rolled integration rather than Rapier — the physics engine is a lazy
 * chunk that must not block the very first paint.
 */
export function createLoader() {
  const root = document.getElementById('loader');
  const canvas = document.getElementById('loader-canvas');
  const pctEl = document.getElementById('loader-pct');
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  const resize = () => ({ w: W, h: H } = fitCanvas(canvas, ctx));
  resize();
  window.addEventListener('resize', resize);

  const random = seeded(4771);
  const titles = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const spines = [P.rose, P.night, P.gold, P.rose, P.slate, P.ember, P.night];
  const COUNT = env.mobile ? 5 : 7;

  const bookW = () => clamp(Math.min(W * 0.46, 420), 180, 420);
  const bookH = () => clamp(bookW() * 0.13, 22, 54);

  const books = Array.from({ length: COUNT }, (_, i) => ({
    i,
    y: -140 - i * rand(90, 200),
    vy: 0,
    x: 0,
    ox: (random() - 0.5) * 0.16,
    rot: (random() - 0.5) * 0.5,
    vrot: (random() - 0.5) * 0.9,
    squash: 1,
    landed: false,
    widthScale: 0.78 + random() * 0.22,
    spine: spines[i % spines.length],
    label: titles[i % titles.length],
  }));

  let progress = 0;
  let shown = 0;
  let running = true;
  let released = false;
  const start = performance.now();

  function step(dt) {
    const bh = bookH();
    const baseY = H * 0.62;
    books.forEach((b, i) => {
      const floor = baseY - i * (bh * 0.92);
      if (b.landed) {
        b.squash += (1 - b.squash) * 0.14;
        b.rot += (b.ox * 0.6 - b.rot) * 0.1;
        return;
      }
      // delay each book so they arrive as a sequence, not a curtain
      if (performance.now() - start < i * 130) return;
      b.vy += 2600 * dt;
      b.y += b.vy * dt;
      b.rot += b.vrot * dt;
      if (b.y >= floor) {
        b.y = floor;
        if (Math.abs(b.vy) > 240) {
          b.squash = clamp(1 - b.vy / 5200, 0.55, 1);
          b.vy *= -0.32;
          b.vrot *= -0.4;
        } else {
          b.vy = 0;
          b.landed = true;
          b.squash = 0.72;
        }
      }
    });
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const bw = bookW();
    const bh = bookH();

    // a pool of light on the floor
    const g = ctx.createRadialGradient(W / 2, H * 0.64, 10, W / 2, H * 0.64, bw * 1.2);
    g.addColorStop(0, rgba(P.gold, 0.16));
    g.addColorStop(1, rgba(P.gold, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    books.forEach((b) => {
      const w = bw * b.widthScale;
      ctx.save();
      ctx.translate(W / 2 + b.ox * bw, b.y);
      ctx.rotate(b.rot * 0.12);
      ctx.scale(1 / b.squash ** 0.4, b.squash);

      // shadow
      ctx.fillStyle = rgba(P.ink, 0.1);
      ctx.beginPath();
      ctx.roundRect(-w / 2 + 3, -bh + 5, w, bh, 4);
      ctx.fill();

      // pages
      ctx.fillStyle = P.cream;
      ctx.strokeStyle = rgba(P.ink, 0.22);
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -bh, w, bh, 3);
      ctx.fill();
      ctx.stroke();

      // page striations
      ctx.strokeStyle = rgba(P.ink, 0.07);
      for (let y = -bh + 4; y < -3; y += 3) {
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 8, y);
        ctx.lineTo(w / 2 - 4, y);
        ctx.stroke();
      }

      // spine
      ctx.fillStyle = b.spine;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -bh, Math.max(10, w * 0.08), bh, [3, 0, 0, 3]);
      ctx.fill();

      // gold foil title bar
      ctx.fillStyle = rgba(P.gold, 0.85);
      ctx.fillRect(-w / 2 + w * 0.14, -bh * 0.62, w * 0.3, 1.5);
      ctx.font = `600 ${Math.max(8, bh * 0.3)}px Nunito, sans-serif`;
      ctx.fillStyle = rgba(P.ink, 0.45);
      ctx.textBaseline = 'middle';
      ctx.fillText(b.label, -w / 2 + w * 0.14, -bh * 0.34);
      ctx.restore();
    });
  }

  // Failsafe: whatever happens to the animation, the veil lifts.
  setTimeout(() => root.classList.add('is-done'), 12000);

  let last = performance.now();
  function tick(now) {
    if (!running) return;
    const dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    step(dt);
    draw();

    shown += (progress - shown) * damp(0.09, dt * 60);
    pctEl.textContent = String(Math.round(shown * 100)).padStart(2, '0');
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  return {
    set(p) {
      progress = clamp(p, progress, 1);
    },
    /** Resolve once the stack is built and the veil has lifted. */
    async done() {
      if (released) return;
      released = true;
      progress = 1;
      const elapsed = performance.now() - start;
      await new Promise((r) => setTimeout(r, Math.max(0, 1100 - elapsed)));
      pctEl.textContent = '100';

      // On a slow machine the stack may still be in the air; drop it into place
      // so everyone gets to see the shelf complete itself before it lifts away.
      const bh = bookH();
      books.forEach((b, i) => {
        b.y = Math.min(b.y, H * 0.62 - i * (bh * 0.92));
        b.vy = 0;
        b.landed = true;
      });
      await new Promise((r) => setTimeout(r, 260));

      await gsap.to(books, {
        y: (i) => -240 - i * 90,
        vy: 0,
        duration: 0.85,
        ease: 'power3.in',
        stagger: 0.045,
        onUpdate: () => books.forEach((b) => (b.landed = true)),
      });
      root.classList.add('is-done');
      setTimeout(() => {
        running = false;
        root.remove();
      }, 950);
    },
  };
}
