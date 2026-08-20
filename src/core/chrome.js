import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { smoothScroll } from './smoothScroll.js';
import { audio } from './audio.js';
import { mountIcon, speakerData } from './lottieIcons.js';

/** Menu, section rail, scroll progress, mood switching, and sound toggle. */
export function initChrome() {
  const sections = [...document.querySelectorAll('.sec')];

  /* ── section rail ───────────────────────────────────────── */
  const rail = document.getElementById('rail');
  const railItems = sections.map((sec) => {
    const item = document.createElement('span');
    item.className = 'rail__item';
    item.innerHTML = `<b>${sec.dataset.index}</b><em>${sec.dataset.label}</em>`;
    rail.appendChild(item);
    return item;
  });

  /* ── progress bar ───────────────────────────────────────── */
  const fill = document.getElementById('progress-fill');
  gsap.to(fill, {
    scaleY: 1,
    ease: 'none',
    scrollTrigger: { trigger: document.body, start: 'top top', end: 'bottom bottom', scrub: 0.4 },
  });

  /* ── mood + active section ──────────────────────────────────
     Measured from live geometry rather than declared ScrollTrigger ranges:
     section 01 is pinned, which shifts its trigger positions away from where
     the section actually appears on screen. Whatever covers the middle of the
     viewport is the section you are in. */
  let activeIndex = -1;
  const syncActive = () => {
    const middle = window.innerHeight / 2;
    let found = 0;
    for (let i = 0; i < sections.length; i++) {
      const rect = sections[i].getBoundingClientRect();
      if (rect.top <= middle && rect.bottom > middle) found = i;
    }
    if (found === activeIndex) return;
    activeIndex = found;
    document.body.dataset.mood = sections[found].dataset.mood || 'paper';
    railItems.forEach((it, j) => it.classList.toggle('is-active', j === found));
  };
  ScrollTrigger.create({ onUpdate: syncActive, onRefresh: syncActive });
  syncActive();

  // the gold rule under each chapter number draws itself in
  document.querySelectorAll('.chapter').forEach((el) => {
    gsap.fromTo(
      el,
      { '--rule': 0 },
      {
        '--rule': 1,
        duration: 1.4,
        ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 82%' },
      }
    );
  });

  /* ── menu ───────────────────────────────────────────────── */
  const menu = document.getElementById('menu');
  const menuToggle = document.getElementById('menu-toggle');
  menu.querySelectorAll('.menu__list li').forEach((li, i) => li.style.setProperty('--i', i));

  const setMenu = (open) => {
    menu.classList.toggle('is-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.querySelector('.menu-toggle__label').textContent = open ? 'Close' : 'Menu';
  };
  menuToggle.addEventListener('click', () => setMenu(!menu.classList.contains('is-open')));
  document.addEventListener('keydown', (e) => e.key === 'Escape' && setMenu(false));

  /* ── go-to navigation ───────────────────────────────────── */
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-goto]');
    if (!trigger) return;
    e.preventDefault();
    setMenu(false);
    const target = document.getElementById(trigger.dataset.goto);
    // let the menu curtain start lifting before the page moves
    setTimeout(() => smoothScroll.toElement(target, -1), menu.classList.contains('is-open') ? 260 : 0);
  });

  /* ── sound ──────────────────────────────────────────────── */
  const toggle = document.getElementById('audio-toggle');
  const icon = mountIcon(document.getElementById('audio-lottie'), speakerData(), { autoplay: false });
  toggle.addEventListener('click', async () => {
    const on = await audio.toggle();
    toggle.setAttribute('aria-pressed', String(!!on));
    // 'On' rather than 'Sound on': the label has a fixed width, so the pill
    // must not grow when the state changes.
    toggle.querySelector('.audio-toggle__label').textContent = on ? 'On' : 'Sound';
    if (icon) on ? icon.play() : icon.stop();
  });

  // hover sounds for anything that asks for one
  document.querySelectorAll('[data-sfx]').forEach((el) => {
    el.addEventListener('pointerenter', () => {
      const kind = el.dataset.sfx;
      if (kind === 'chime') audio.chime();
      else if (kind === 'thud') audio.thud(0.3);
    });
  });

  // paper rustle while scrolling
  let lastY = window.scrollY;
  ScrollTrigger.create({
    onUpdate: (self) => {
      const y = window.scrollY;
      const d = Math.abs(y - lastY);
      lastY = y;
      if (d > 26) audio.rustle(Math.min(d / 90, 1));
      document.body.classList.toggle('is-fast', Math.abs(self.getVelocity()) > 2200);
    },
  });

  return { setMenu };
}
