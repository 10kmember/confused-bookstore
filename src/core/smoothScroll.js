import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { clamp, damp, lerp } from '../util/math.js';
import { env } from '../util/env.js';

/**
 * Buttery scroll without ScrollSmoother (a paid GSAP club plugin).
 *
 * We keep the *native* scroll position authoritative — wheel/key input feeds a
 * virtual target, and every frame we ease the real `window.scrollTo` toward it.
 * Because the document really scrolls, ScrollTrigger, anchors, focus and
 * accessibility tooling all keep working; only the easing is ours.
 */
class SmoothScroll {
  constructor() {
    this.target = window.scrollY;
    this.current = this.target;
    this.enabled = false;
    this.speed = 1;
    this.velocity = 0;
    this._listeners = new Set();
  }

  init() {
    // Touch devices already have momentum scrolling that beats anything we do.
    if (env.reduced || env.coarse) {
      this._raw();
      return this;
    }
    this.enabled = true;
    this.target = window.scrollY;
    this.current = this.target;

    window.addEventListener('wheel', this._onWheel, { passive: false });
    window.addEventListener('keydown', this._onKey);
    window.addEventListener('resize', this._onResize);
    // Scrollbar drags and browser-driven jumps: adopt them as the new target.
    window.addEventListener('scroll', this._onScroll, { passive: true });

    gsap.ticker.add(this._tick);
    return this;
  }

  /** Reduced-motion / touch path: still report scroll velocity to listeners. */
  _raw() {
    let last = window.scrollY;
    window.addEventListener(
      'scroll',
      () => {
        const y = window.scrollY;
        this.velocity = y - last;
        last = y;
        this.current = this.target = y;
        this._emit();
      },
      { passive: true }
    );
  }

  get max() {
    return Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  _onWheel = (e) => {
    if (!this.enabled || e.ctrlKey) return;
    if (e.target.closest?.('[data-native-scroll]')) return;
    e.preventDefault();
    // deltaMode: 0 px, 1 lines, 2 pages
    const unit = e.deltaMode === 1 ? 18 : e.deltaMode === 2 ? window.innerHeight : 1;
    this.target = clamp(this.target + e.deltaY * unit * this.speed, 0, this.max);
  };

  _onKey = (e) => {
    if (!this.enabled) return;
    const tag = document.activeElement?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const page = window.innerHeight * 0.85;
    const moves = {
      ArrowDown: 90,
      ArrowUp: -90,
      PageDown: page,
      PageUp: -page,
      ' ': e.shiftKey ? -page : page,
      Home: -this.max,
      End: this.max,
    };
    const d = moves[e.key];
    if (d === undefined) return;
    e.preventDefault();
    this.target = clamp(this.target + d, 0, this.max);
  };

  _onResize = () => {
    this.target = clamp(this.target, 0, this.max);
  };

  _onScroll = () => {
    // If something else moved the page (find-in-page, scrollbar, anchor focus)
    // the real position drifts from our eased value — re-sync instead of fighting.
    if (!this.enabled) return;
    if (Math.abs(window.scrollY - this.current) > 4 && Math.abs(this.current - this.target) < 0.6) {
      this.target = this.current = window.scrollY;
    }
  };

  _tick = (_time, deltaMs) => {
    if (!this.enabled) return;
    const dt = Math.min(deltaMs, 48) / 1000;
    const prev = this.current;
    this.current = lerp(this.current, this.target, damp(0.16, dt * 60, 1));
    if (Math.abs(this.target - this.current) < 0.08) this.current = this.target;
    this.velocity = this.current - prev;
    if (this.current !== prev) {
      window.scrollTo(0, this.current);
      ScrollTrigger.update();
    }
    this._emit();
  };

  _emit() {
    for (const fn of this._listeners) fn(this);
  }

  onFrame(fn) {
    this._listeners.add(fn);
    return () => this._listeners.delete(fn);
  }

  /** Programmatic navigation. `immediate` snaps without easing. */
  to(y, { immediate = false } = {}) {
    const dest = clamp(y, 0, this.max);
    if (!this.enabled || immediate) {
      window.scrollTo({ top: dest, behavior: immediate ? 'auto' : 'smooth' });
      this.target = this.current = dest;
      return;
    }
    this.target = dest;
  }

  toElement(el, offset = 0) {
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY + offset;
    this.to(y);
  }
}

export const smoothScroll = new SmoothScroll();
