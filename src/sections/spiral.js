import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { buildGallery } from '../util/art.js';
import { createModal } from '../core/modal.js';
import { env } from '../util/env.js';
import { clamp, lerp, TAU } from '../util/math.js';

/* ═══════════════ 01 — THE SPIRAL GALLERY ═══════════════ */

/**
 * Plates are laid out on a golden-angle spiral. Scrolling turns the spiral and
 * pushes it outward; each plate carries its own depth so the near ones travel
 * further than the far ones — parallax without a parallax library.
 */
export function initSpiral() {
  const section = document.getElementById('spiral');
  const stage = document.getElementById('spiral-stage');
  const modal = createModal();
  const items = buildGallery();

  const GOLDEN = 2.399963;
  const nodes = items.map((item, i) => {
    const el = document.createElement('button');
    el.className = 'spiral-item';
    el.type = 'button';
    el.setAttribute('role', 'listitem');
    el.dataset.step = String(i % 3);
    el.style.setProperty('--tilt', `${(i % 2 ? 1 : -1) * (1.2 + (i % 3) * 0.9)}deg`);
    el.innerHTML = `
      <span class="spiral-item__frame"></span>
      <span class="spiral-item__cap">${String(i + 1).padStart(2, '0')} · ${item.kicker}</span>`;
    el.setAttribute('aria-label', `${item.title} — ${item.kicker}`);
    item.canvas.setAttribute('role', 'img');
    item.canvas.setAttribute('aria-label', `${item.title} — ${item.kicker}`);
    el.querySelector('.spiral-item__frame').appendChild(item.canvas);
    item.index = `${String(i + 1).padStart(2, '0')} of ${String(items.length).padStart(2, '0')}`;
    el.addEventListener('click', () => modal.open(item, el));
    stage.appendChild(el);

    return {
      el,
      item,
      angle: i * GOLDEN,
      radius: 0.14 + (i / items.length) * 0.6,
      depth: 0.62 + ((i * 37) % 100) / 125,
      setter: gsap.quickSetter(el, 'css'),
    };
  });

  const view = { rotation: 0, spread: 0.92, pointerX: 0, pointerY: 0 };
  let rendered = { x: 0, y: 0 };

  /** Plates shrink on narrower windows so the orbit still reads as an orbit. */
  const plateWidth = (step) => {
    const base = window.innerWidth < 1000 ? 132 : 176;
    return base + step * (window.innerWidth < 1000 ? 14 : 22);
  };

  function layout() {
    if (column) return;
    const rect = stage.getBoundingClientRect();
    const unit = Math.min(rect.width, rect.height * 1.4) * 0.5;
    // On wide screens the stage itself is inset to the right half (see the CSS),
    // so the plates orbit beside the heading rather than across it.
    const offsetY = rect.width > 700 ? 0 : rect.height * 0.1;

    nodes.forEach((n) => {
      const a = n.angle + view.rotation * n.depth;
      const r = unit * n.radius * view.spread * (0.72 + n.depth * 0.4);
      const x = Math.cos(a) * r + view.pointerX * 26 * n.depth;
      const y = offsetY + Math.sin(a) * r * 0.8 + view.pointerY * 20 * n.depth;
      const scale = clamp(0.58 + n.depth * 0.42, 0.45, 1.1);
      const fade = clamp(1.5 - Math.abs(r) / (unit * 1.4), 0.14, 1);
      n.el.style.setProperty('--w', `${plateWidth(Number(n.el.dataset.step))}px`);
      n.setter({
        transform: `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${scale})`,
        opacity: fade,
        zIndex: Math.round(n.depth * 100),
      });
    });
  }

  // ── scroll drives the turn ──
  // Below the breakpoint the spiral collapses into a single column: a turning
  // orbit of overlapping plates is unreadable on a phone, and pinning a section
  // that already fills the screen only steals the scroll.
  const column = env.mobile;
  stage.classList.toggle('spiral__stage--column', column);
  if (column) {
    section.querySelector('.lede').textContent =
      'Interior spreads, field photographs, and assorted evidence from a book that refuses to hold still. Tap anything to open it like a pop-up.';
  }

  if (!column) {
    ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: '+=180%',
      pin: true,
      pinSpacing: true,
      scrub: 0.6,
      onUpdate: (self) => {
        view.rotation = self.progress * TAU * 0.5;
        view.spread = 0.92 + self.progress * 0.46;
        layout();
      },
    });
  }

  // ── cursor parallax ──
  if (!env.coarse) {
    window.addEventListener(
      'pointermove',
      (e) => {
        rendered.x = (e.clientX / window.innerWidth) * 2 - 1;
        rendered.y = (e.clientY / window.innerHeight) * 2 - 1;
      },
      { passive: true }
    );
  }

  // The entrance is CSS, not GSAP: `layout()` owns each item's transform, and a
  // tween writing to the same property would fight it every frame.
  ScrollTrigger.create({
    trigger: section,
    start: 'top 72%',
    once: true,
    onEnter: () =>
      nodes.forEach((n, i) => {
        n.el.style.setProperty('--delay', `${i * 70}ms`);
        n.el.classList.add('is-in');
      }),
  });

  window.addEventListener('resize', layout);
  layout();

  if (column) return null;

  return {
    frame() {
      view.pointerX = lerp(view.pointerX, rendered.x, 0.05);
      view.pointerY = lerp(view.pointerY, rendered.y, 0.05);
      if (Math.abs(view.pointerX - rendered.x) > 0.001) layout();
    },
  };
}
