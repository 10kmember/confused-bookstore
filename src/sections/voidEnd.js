import { P, rgba } from '../core/palette.js';
import { env, fitCanvas, tier } from '../util/env.js';
import { rand, TAU } from '../util/math.js';

/* ═══════════════ THE VOID (there is no footer) ═══════════════ */

/** The book drifts up out of frame forever, trailing gold dust. */
export function initVoid() {
  const canvas = document.getElementById('void-canvas');
  const ctx = canvas.getContext('2d');

  let W = 0;
  let H = 0;
  const resize = () => ({ w: W, h: H } = fitCanvas(canvas, ctx));
  resize();
  window.addEventListener('resize', resize);

  const motes = Array.from({ length: tier() === 2 ? 110 : 50 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(0.5, 2),
    v: env.reduced ? 0 : rand(0.0004, 0.0022),
    a: rand(0.1, 0.7),
  }));

  const book = { y: 1.15, x: 0.5, rot: 0 };
  let visible = false;
  new IntersectionObserver((e) => (visible = e[0].isIntersecting), { rootMargin: '100px' }).observe(canvas);

  return {
    frame(now) {
      if (!visible) return;
      ctx.clearRect(0, 0, W, H);

      const glow = ctx.createRadialGradient(W / 2, H * 0.42, 10, W / 2, H * 0.42, Math.max(W, H) * 0.6);
      glow.addColorStop(0, rgba(P.slate, 0.1));
      glow.addColorStop(1, rgba(P.night, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      for (const m of motes) {
        m.y -= m.v;
        if (m.y < -0.02) {
          m.y = 1.02;
          m.x = Math.random();
        }
        ctx.fillStyle = rgba(P.gold, m.a * 0.5);
        ctx.beginPath();
        ctx.arc(m.x * W, m.y * H, m.r, 0, TAU);
        ctx.fill();
      }

      // the book, receding
      if (!env.reduced) book.y -= 0.00035;
      if (book.y < -0.35) book.y = 1.2;
      book.rot = env.reduced ? 0.08 : Math.sin(now / 2600) * 0.25;
      const depth = 0.35 + book.y * 0.65;
      const w = 54 * depth;
      const h = 78 * depth;

      ctx.save();
      ctx.translate(W * book.x, H * book.y);
      ctx.rotate(book.rot);
      ctx.globalAlpha = Math.min(1, depth);
      ctx.fillStyle = rgba(P.cream, 0.9);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 3);
      ctx.fill();
      ctx.fillStyle = P.rose;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w * 0.18, h, [3, 0, 0, 3]);
      ctx.fill();
      ctx.strokeStyle = rgba(P.gold, 0.9);
      ctx.lineWidth = 1;
      ctx.strokeRect(-w * 0.24, -h * 0.34, w * 0.6, h * 0.68);
      ctx.restore();
      ctx.globalAlpha = 1;
    },
  };
}
