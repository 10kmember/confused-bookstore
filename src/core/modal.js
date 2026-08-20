import gsap from 'gsap';
import { audio } from './audio.js';
import { dataURL } from '../util/art.js';

/** The pop-up book: a page that folds up from the gutter and lies back down. */
export function createModal() {
  const root = document.getElementById('modal');
  const page = root.querySelector('.modal__page');
  const image = document.getElementById('modal-image');
  const kicker = document.getElementById('modal-kicker');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');
  let lastFocus = null;

  /** Idempotent: whichever gets there first — the tween or the safety net. */
  const finish = () => {
    if (!root.classList.contains('is-open')) return;
    root.classList.remove('is-open');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('is-locked');
    lastFocus?.focus?.();
  };

  const close = () => {
    if (!root.classList.contains('is-open')) return;
    gsap.to(page, { rotateX: -92, opacity: 0, duration: 0.45, ease: 'power3.in', onComplete: finish });
    // A dialog must never outlive its animation: if the page is busy enough
    // that the tween stalls, the modal still closes.
    setTimeout(finish, 700);
  };

  root.addEventListener('click', (e) => e.target.closest('[data-close]') && close());
  document.addEventListener('keydown', (e) => e.key === 'Escape' && close());

  return {
    open(item, trigger) {
      lastFocus = trigger || document.activeElement;
      image.src = dataURL(item);
      image.alt = `${item.title} — ${item.kicker}`;
      kicker.textContent = item.index ? `${item.kicker} · plate ${item.index}` : item.kicker;
      title.textContent = item.title;
      body.textContent = item.body;

      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      document.body.classList.add('is-locked');
      audio.rustle(0.9);

      gsap.fromTo(
        page,
        { rotateX: -92, opacity: 0, y: 30 },
        { rotateX: 0, opacity: 1, y: 0, duration: 0.9, ease: 'back.out(1.4)' }
      );
      gsap.fromTo(
        page.querySelectorAll('.modal__text > *'),
        { y: 18, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, stagger: 0.07, delay: 0.25, ease: 'power3.out' }
      );
      root.querySelector('.modal__close').focus({ preventScroll: true });
    },
    close,
  };
}
