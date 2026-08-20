import gsap from 'gsap';
import { P, rgba } from './palette.js';
import { env, fitCanvas } from '../util/env.js';
import { damp, lerp } from '../util/math.js';

/**
 * A tiny glowing quill that leaks a warm-gold trail.
 * Canvas based so the trail can fade per-frame without a thousand DOM nodes.
 */
export function initCursor() {
  if (env.coarse || env.reduced) return null;

  const canvas = document.getElementById('cursor-canvas');
  const ctx = canvas.getContext('2d');
  document.body.classList.add('has-quill');

  let W = 0;
  let H = 0;
  const resize = () => ({ w: W, h: H } = fitCanvas(canvas, ctx));
  resize();
  window.addEventListener('resize', resize);

  const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
  const quill = { x: pointer.x, y: pointer.y, angle: -0.5, scale: 1 };
  const trail = [];
  const state = { mode: 'default', ring: 0, pulse: 0, down: 0 };

  const GRAB = 'button, a, input, .spiral-item, [data-grab]';
  const PHYSICS = '[data-physics]';

  window.addEventListener(
    'pointermove',
    (e) => {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      const el = e.target;
      state.mode = el.closest?.(PHYSICS)
        ? 'physics'
        : el.closest?.(GRAB)
          ? 'grab'
          : 'default';
    },
    { passive: true }
  );
  window.addEventListener('pointerdown', () => (state.down = 1));
  window.addEventListener('pointerup', () => (state.down = 0));
  document.addEventListener('pointerleave', () => (state.mode = 'hidden'));
  document.addEventListener('pointerenter', () => (state.mode = 'default'));

  function draw(_t, deltaMs) {
    const dt = Math.min(deltaMs, 48);
    const k = damp(0.22, dt / 16.67);

    const px = quill.x;
    const py = quill.y;
    quill.x = lerp(quill.x, pointer.x, k);
    quill.y = lerp(quill.y, pointer.y, k);

    const vx = quill.x - px;
    const vy = quill.y - py;
    const speed = Math.hypot(vx, vy);
    if (speed > 0.4) quill.angle = lerp(quill.angle, Math.atan2(vy, vx), 0.12);

    trail.push({ x: quill.x, y: quill.y, life: 1, w: 1 + Math.min(speed * 0.22, 3.4) });
    if (trail.length > 46) trail.shift();

    state.ring = lerp(state.ring, state.mode === 'grab' ? 1 : 0, 0.16);
    state.pulse = lerp(state.pulse, state.mode === 'physics' ? 1 : 0, 0.16);

    ctx.clearRect(0, 0, W, H);
    if (state.mode === 'hidden') return;

    // ── ink trail ──
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 1; i < trail.length; i++) {
      const a = trail[i - 1];
      const b = trail[i];
      const t = i / trail.length;
      ctx.beginPath();
      ctx.strokeStyle = rgba(state.pulse > 0.5 ? P.ember : P.gold, t * t * 0.5 * a.life);
      ctx.lineWidth = b.w * t;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      a.life *= 0.97;
    }

    // ── the quill ──
    ctx.save();
    ctx.translate(quill.x, quill.y);
    ctx.rotate(quill.angle + Math.PI * 0.75);
    const s = 1 - state.down * 0.16;
    ctx.scale(s, s);

    // glow
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 26);
    glow.addColorStop(0, rgba(state.pulse > 0.5 ? P.ember : P.gold, 0.34));
    glow.addColorStop(1, rgba(P.gold, 0));
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, 26, 0, Math.PI * 2);
    ctx.fill();

    // feather
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-5, -12, -3.5, -24);
    ctx.quadraticCurveTo(2.5, -14, 0.6, -3);
    ctx.closePath();
    ctx.fillStyle = rgba(P.cream, 0.92);
    ctx.fill();
    ctx.strokeStyle = rgba(P.rose, 0.55);
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // nib
    ctx.beginPath();
    ctx.moveTo(-0.4, 1);
    ctx.lineTo(2.6, -4.4);
    ctx.lineTo(-2.8, -3.4);
    ctx.closePath();
    ctx.fillStyle = state.pulse > 0.5 ? P.ember : P.rose;
    ctx.fill();
    ctx.restore();

    // ── grab ring ──
    if (state.ring > 0.01) {
      ctx.beginPath();
      ctx.strokeStyle = rgba(P.rose, state.ring * 0.7);
      ctx.lineWidth = 1.2;
      ctx.arc(quill.x, quill.y, 16 + state.ring * 8 + state.down * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    // ── physics pulse ──
    if (state.pulse > 0.01) {
      const r = 14 + Math.sin(performance.now() / 220) * 5;
      ctx.beginPath();
      ctx.strokeStyle = rgba(P.ember, state.pulse * 0.75);
      ctx.lineWidth = 1.4;
      ctx.arc(quill.x, quill.y, r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  gsap.ticker.add(draw);
  return { canvas };
}
