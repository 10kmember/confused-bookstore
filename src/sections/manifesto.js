import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { book } from '../content/book.js';

/* ═══════════════ 03 — THE CONFUSED MANIFESTO ═══════════════ */

/** The numbers themselves live in src/content/book.js. */
const STATS = book.stats;

export function initManifesto() {
  const list = document.getElementById('stats');

  STATS.forEach((stat, i) => {
    const li = document.createElement('li');
    li.className = 'stat';
    li.innerHTML = `
      <span class="stat__num">${String(i + 1).padStart(2, '0')}</span>
      <span class="stat__value" data-value="${stat.value}">0${stat.suffix || ''}</span>
      <span class="stat__body">
        <span class="stat__label">${stat.label}</span>
        <span class="stat__note">${stat.note}</span>
      </span>`;
    list.appendChild(li);

    const valueEl = li.querySelector('.stat__value');
    const counter = { n: 0 };

    gsap.to(counter, {
      n: stat.value,
      duration: 1.8,
      ease: 'power2.out',
      snap: { n: 1 },
      onUpdate: () => (valueEl.textContent = `${Math.round(counter.n)}${stat.suffix || ''}`),
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
