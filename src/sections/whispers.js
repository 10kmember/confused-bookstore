import gsap from 'gsap';
import { P, rgba } from '../core/palette.js';
import { audio } from '../core/audio.js';
import { flagData, mountIcon } from '../core/lottieIcons.js';
import { book } from '../content/book.js';
import { env, fitCanvas, tier } from '../util/env.js';
import { clamp, rand } from '../util/math.js';

/* ═══════════════ 04 — THE WHISPER WALL ═══════════════ */

const STORE = 'confused-bookstore/whispers';
const MAX_STORED = 40;
const LIFETIME = 46; // seconds before a whisper forgets itself

/** Whispers the room starts with; edit them in src/content/book.js. */
const SEED = book.whisperSeeds;

/**
 * Whispers drift upward through a projected z-space, then break apart into
 * their own letters. They live in localStorage on this device only — there is
 * no server, and nothing is transmitted.
 */
export function initWhispers() {
  const canvas = document.getElementById('whisper-canvas');
  const ctx = canvas.getContext('2d');
  const form = document.getElementById('whisper-form');
  const input = document.getElementById('whisper-input');
  const note = document.getElementById('whisper-note');

  const flag = document.createElement('span');
  flag.className = 'flag';
  note.prepend(flag);
  mountIcon(flag, flagData());

  let W = 0;
  let H = 0;
  const resize = () => ({ w: W, h: H } = fitCanvas(canvas, ctx));
  resize();
  window.addEventListener('resize', resize);

  const load = () => {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE) || '[]');
      return Array.isArray(raw) ? raw.slice(-MAX_STORED) : [];
    } catch {
      return [];
    }
  };
  const save = (list) => {
    try {
      localStorage.setItem(STORE, JSON.stringify(list.slice(-MAX_STORED)));
    } catch {
      /* private browsing — the wall simply forgets faster */
    }
  };

  const stored = load();
  const whispers = [];
  const shards = [];

  function release(text, { fresh = false } = {}) {
    const whisper = {
      text: text.slice(0, 60),
      x: rand(-0.42, 0.42),
      y: fresh ? 0.62 : rand(-0.4, 0.6),
      z: fresh ? 0.12 : rand(0.05, 1),
      drift: env.reduced ? 0 : rand(0.012, 0.03),
      sway: rand(0, Math.PI * 2),
      age: fresh ? 0 : rand(0, LIFETIME * 0.6),
      fresh,
    };
    whispers.push(whisper);
    if (whispers.length > (tier() === 2 ? 26 : 14)) whispers.shift();
    return whisper;
  }

  [...SEED, ...stored].slice(-18).forEach((t) => release(t));

  /* ── form ─────────────────────────────────────────────── */
  const counter = document.getElementById('whisper-count');
  const updateCount = () => {
    const left = 60 - input.value.length;
    counter.textContent = String(left);
    counter.parentElement.classList.toggle('is-low', left <= 12);
  };
  input.addEventListener('input', updateCount);
  updateCount();

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) {
      form.classList.remove('is-shaking');
      void form.offsetWidth; // restart the animation
      form.classList.add('is-shaking');
      input.focus();
      return;
    }
    release(text, { fresh: true });
    save([...load(), text]);
    audio.chime();
    input.value = '';
    updateCount();
    gsap.fromTo(
      input,
      { color: P.gold },
      { color: P.cream, duration: 1.4, ease: 'power2.out' }
    );
  });

  /* ── projection ───────────────────────────────────────── */
  const FOCAL = 1.4;
  const project = (w) => {
    const scale = FOCAL / (FOCAL + w.z * 2.2);
    // On wide screens the drift is biased right so the whispers pass beside the
    // copy rather than straight through it.
    const bias = W > 1000 ? 0.2 : 0;
    return {
      x: W * (0.5 + bias) + w.x * W * scale * 0.9 + Math.sin(w.sway + w.age * 0.4) * 14 * scale,
      y: H / 2 + w.y * H * scale,
      scale,
    };
  };

  let last = performance.now();
  return {
    frame(now) {
      const dt = clamp((now - last) / 1000, 0, 0.05);
      last = now;
      ctx.clearRect(0, 0, W, H);

      // depth haze
      const haze = ctx.createRadialGradient(W / 2, H / 2, 20, W / 2, H / 2, Math.max(W, H) * 0.7);
      haze.addColorStop(0, rgba(P.slate, 0.07));
      haze.addColorStop(1, rgba(P.night, 0));
      ctx.fillStyle = haze;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let i = whispers.length - 1; i >= 0; i--) {
        const w = whispers[i];
        w.age += dt;
        w.y -= w.drift * dt * (1.4 - w.z * 0.6);
        w.z += env.reduced ? 0 : dt * 0.006;

        const life = 1 - w.age / LIFETIME;
        if (life <= 0) {
          shatter(w);
          whispers.splice(i, 1);
          continue;
        }

        const p = project(w);
        const fade = clamp(Math.min(life * 3, 1), 0, 1) * clamp(1.15 - w.z, 0.12, 1);
        const size = clamp(30 * p.scale, 9, 34);

        ctx.font = `300 ${size}px Nunito, sans-serif`;
        ctx.fillStyle = rgba(w.fresh ? P.gold : P.slate, fade * (w.fresh ? 0.95 : 0.68));
        if (w.z < 0.3) {
          ctx.shadowColor = rgba(P.slate, 0.5);
          ctx.shadowBlur = 18 * (1 - w.z);
        }
        // keep a whisper whole: nothing readable should slide off the edge
        const half = ctx.measureText(w.text).width / 2 + 28;
        ctx.fillText(w.text, clamp(p.x, half, Math.max(half, W - half)), p.y);
        ctx.shadowBlur = 0;
      }

      // letters coming apart
      for (let i = shards.length - 1; i >= 0; i--) {
        const s = shards[i];
        s.life -= dt * 0.55;
        if (s.life <= 0) {
          shards.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt * 60;
        s.y += s.vy * dt * 60;
        s.vy -= 0.004;
        s.rot += s.vr * dt;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.font = `300 ${s.size}px Nunito, sans-serif`;
        ctx.fillStyle = rgba(P.slate, s.life * 0.5);
        ctx.fillText(s.char, 0, 0);
        ctx.restore();
      }
    },
  };

  function shatter(w) {
    if (env.reduced || tier() === 0) return;
    const p = project(w);
    const size = clamp(30 * p.scale, 9, 34);
    ctx.font = `300 ${size}px Nunito, sans-serif`;
    const width = ctx.measureText(w.text).width;
    [...w.text].forEach((char, i) => {
      if (char === ' ') return;
      shards.push({
        char,
        x: p.x - width / 2 + (i / w.text.length) * width,
        y: p.y,
        vx: rand(-0.5, 0.5),
        vy: rand(-1.1, -0.2),
        rot: 0,
        vr: rand(-1.4, 1.4),
        size,
        life: rand(0.6, 1),
      });
    });
  }
}
