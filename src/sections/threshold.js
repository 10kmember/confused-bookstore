import gsap from 'gsap';
import { createStage } from '../three/stage.js';
import { BookController, createBook, createHalo } from '../three/book.js';
import { drawFlatBook } from '../three/flatBook.js';
import { P, rgba } from '../core/palette.js';
import { audio } from '../core/audio.js';
import { smoothScroll } from '../core/smoothScroll.js';
import { env, fitCanvas, tier } from '../util/env.js';
import { clamp, lerp, rand, TAU } from '../util/math.js';

/* ═══════════════ 00 — THE THRESHOLD ═══════════════ */

/** Dust in a sunbeam: a drifting particle network that flinches from the cursor. */
function particleField(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0;
  let H = 0;
  const resize = () => ({ w: W, h: H } = fitCanvas(canvas, ctx));
  resize();
  window.addEventListener('resize', resize);

  const COUNT = tier() === 2 ? 190 : tier() === 1 ? 120 : 60;
  const LINK = tier() === 2 ? 132 : 108;
  const dots = Array.from({ length: COUNT }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    vx: rand(-0.16, 0.16),
    vy: rand(-0.16, 0.16),
    r: rand(0.7, 2.1),
    gold: Math.random() > 0.72,
  }));

  const pointer = { x: -999, y: -999 };
  window.addEventListener(
    'pointermove',
    (e) => {
      const rect = canvas.getBoundingClientRect();
      pointer.x = e.clientX - rect.left;
      pointer.y = e.clientY - rect.top;
    },
    { passive: true }
  );

  return {
    draw(scroll = 0) {
      ctx.clearRect(0, 0, W, H);
      const drift = scroll * 0.12;

      for (const d of dots) {
        d.x += d.vx;
        d.y += d.vy - drift * 0.01;
        if (d.x < -20) d.x = W + 20;
        if (d.x > W + 20) d.x = -20;
        if (d.y < -20) d.y = H + 20;
        if (d.y > H + 20) d.y = -20;

        // repel from the cursor, then relax
        const dx = d.x - pointer.x;
        const dy = d.y - pointer.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 150) {
          const push = (1 - dist / 150) ** 2 * 1.6;
          d.x += (dx / (dist || 1)) * push;
          d.y += (dy / (dist || 1)) * push;
        }
      }

      // links first, so dots sit on top
      ctx.lineWidth = 0.6;
      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist > LINK) continue;
          const alpha = (1 - dist / LINK) * 0.3;
          ctx.strokeStyle = rgba(a.gold || b.gold ? P.gold : P.rose, alpha);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
      for (const d of dots) {
        ctx.fillStyle = rgba(d.gold ? P.gold : P.rose, d.gold ? 0.8 : 0.42);
        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, TAU);
        ctx.fill();
      }
    },
  };
}

export function initThreshold() {
  const section = document.getElementById('threshold');
  const field = particleField(document.getElementById('hero-particles'));
  const canvas = document.getElementById('hero-webgl');
  canvas.dataset.grab = '';

  const stage = createStage(canvas, { fov: 34 });

  // No WebGL: the cover is a canvas either way, so it is simply drawn flat and
  // the section keeps its shape.
  if (!stage) {
    drawFlatBook(canvas, {
      // beside the headline on wide screens, centred once the layout stacks
      region: () => (window.innerWidth > 900 ? { x: 0.52, w: 0.48 } : { x: 0, w: 1 }),
    });
    document.getElementById('hero-hint').textContent =
      'Your browser is not showing 3D. The book is still here.';
    return {
      frame() {
        if (!env.reduced && window.scrollY < window.innerHeight * 1.4) field.draw(window.scrollY);
      },
    };
  }

  const book = createBook({ scale: 0.94 });
  const halo = createHalo({ opacity: 0.05, size: 3 });
  stage.scene.add(book, halo);

  const controller = new BookController(book, canvas, { stiffness: 30 });
  controller.onThrow = (force) => {
    audio.thud(0.3 + force * 0.6);
    if (stage.fx) gsap.fromTo(stage.fx.uGlitch, { value: 0.5 * force }, { value: 0, duration: 0.7 });
  };

  // The book sits beside the title on wide screens, behind it on narrow ones.
  function place() {
    const wide = window.innerWidth > 900;
    controller.home.set(wide ? 1.4 : 0, wide ? 0.05 : -0.15, 0);
    stage.camera.position.z = wide ? 4.8 : 3.1;
    book.scale.setScalar(wide ? 0.94 : 0.86);
    halo.material.opacity = wide ? 0.05 : 0.035;
  }
  place();
  window.addEventListener('resize', place);

  /* ── entrance: the cover glitches into existence ── */
  if (stage.fx) {
    stage.fx.uVignette.value = 0.22;
    gsap.fromTo(
      stage.fx.uGlitch,
      { value: 1 },
      { value: 0, duration: 2.4, ease: 'power2.out', delay: 0.2 }
    );
  }
  gsap.from(book.scale, { x: 0.2, y: 0.2, z: 0.2, duration: 1.8, ease: 'expo.out', delay: 0.15 });
  gsap.from(book.rotation, { y: -3.2, duration: 2.4, ease: 'expo.out', delay: 0.15 });

  // hovering the book gives it a small chromatic shiver
  canvas.addEventListener('pointerenter', () => {
    if (!stage.fx) return;
    gsap.fromTo(stage.fx.uAberration, { value: 2.4 }, { value: 0.3, duration: 0.9, ease: 'power2.out' });
  });

  /* ── headline ── */
  const lines = section.querySelectorAll('.threshold__title span');
  gsap.from(lines, {
    yPercent: 120,
    opacity: 0,
    rotate: (i) => (i % 2 ? 3 : -3),
    duration: 1.5,
    ease: 'expo.out',
    stagger: 0.09,
    delay: 0.35,
  });
  gsap.from(
    [section.querySelector('.eyebrow'), section.querySelector('.threshold__byline'), section.querySelector('.threshold__actions'), section.querySelector('.threshold__hint')],
    { y: 26, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.1, delay: 0.9 }
  );

  if (env.reduced) {
    field.draw(0);
    window.addEventListener('resize', () => field.draw(0));
  }

  let last = performance.now();
  let aberration = 0;
  return {
    frame(now) {
      const dt = (now - last) / 1000;
      last = now;

      const scroll = window.scrollY;
      // With reduced motion the network is painted once and left alone.
      if (!env.reduced && scroll < window.innerHeight * 1.4) field.draw(scroll);

      if (!stage.visible) return;
      controller.update(dt);

      // fast scrolling separates the RGB channels
      const target = clamp(Math.abs(smoothScroll.velocity) / 26, 0, 3) + controller.agitation * 1.6;
      aberration = lerp(aberration, target, 0.12);
      if (stage.fx) stage.fx.uAberration.value = aberration;

      // the book leans away as you descend past it
      book.position.z = -scroll * 0.0012;
      halo.position.set(book.position.x, book.position.y, book.position.z - 1);
      stage.render(now / 1000);
    },
  };
}
