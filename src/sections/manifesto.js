import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { book } from '../content/book.js';

/* ═══════════════ 03 — THE CONFUSED MANIFESTO ═══════════════ */

/** The numbers themselves live in src/content/book.js. */
const STATS = book.stats;

export function initManifesto() {
  // The rows ship in the HTML so the numbers are readable without JavaScript;
  // here they are simply wound back to zero and counted up on arrival.
  const rows = [...document.querySelectorAll('#stats .stat')];

  rows.forEach((li, i) => {
    const stat = STATS[i];
    const valueEl = li.querySelector('.stat__value');
    if (!stat || !valueEl) return;

    const suffix = stat.suffix || '';
    const counter = { n: 0 };
    valueEl.textContent = `0${suffix}`;

    gsap.to(counter, {
      n: stat.value,
      duration: 1.8,
      ease: 'power2.out',
      snap: { n: 1 },
      onUpdate: () => (valueEl.textContent = `${Math.round(counter.n)}${suffix}`),
      scrollTrigger: { trigger: li, start: 'top 82%', once: true },
    });

    gsap.from(li, {
      y: 40,
      opacity: 0,
      duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: li, start: 'top 88%', once: true },
    });
  });

  gsap.from('.pullquote', {
    opacity: 0,
    rotate: -6,
    y: 40,
    duration: 1.4,
    ease: 'expo.out',
    scrollTrigger: { trigger: '.pullquote', start: 'top 85%', once: true },
  });

  // the night deepens as you read
  ScrollTrigger.create({
    trigger: '#manifesto',
    start: 'top bottom',
    end: 'bottom top',
    scrub: true,
    onUpdate: (self) => {
      document.documentElement.style.setProperty('--night-depth', self.progress.toFixed(3));
    },
  });
}
