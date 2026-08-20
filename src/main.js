import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';

import './styles/fonts.css';
import './styles/base.css';
import './styles/sections.css';

import { createLoader } from './core/loader.js';
import { smoothScroll } from './core/smoothScroll.js';
import { initCursor } from './core/cursor.js';
import { initChrome } from './core/chrome.js';
import { initThreshold } from './sections/threshold.js';
import { initSpiral } from './sections/spiral.js';
import { initManifesto } from './sections/manifesto.js';
import { initWhispers } from './sections/whispers.js';
import { initPortal } from './sections/portal.js';
import { initVoid } from './sections/voidEnd.js';
import { env } from './util/env.js';

gsap.registerPlugin(ScrollTrigger);

// Reduced motion is honoured rather than approximated: every tween still runs
// (so nothing is left half-built), it just resolves immediately.
if (env.reduced) gsap.globalTimeline.timeScale(100);
// Only truly pathological frames (a tab that was frozen, a long GC) get their
// delta clamped; on a merely slow machine animations keep real-world timing
// instead of stretching out to several times their intended length.
gsap.ticker.lagSmoothing(500, 33);

const loader = createLoader();

/**
 * Hand the browser a frame. Building the book textures and the gallery plates
 * is heavy synchronous canvas work; without these pauses the loading animation
 * would freeze exactly when the visitor is watching it.
 */
const breathe = () => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));

/** Everything that wants a frame gets one from this single loop. */
const running = [];
const addRunner = (mod) => mod?.frame && running.push(mod.frame);

/** Run `start` once `selector` comes within reach of the viewport. */
function whenNear(selector, start, rootMargin = '900px') {
  const el = document.querySelector(selector);
  if (!el) return;
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      start();
    },
    { rootMargin }
  );
  io.observe(el);
}

async function boot() {
  loader.set(0.15);

  // Fonts matter here: the book cover and the gallery plates are drawn into
  // canvases, and a canvas cannot re-render itself when a webfont arrives late.
  try {
    await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 4000))]);
  } catch {
    /* no font loading API — the fallbacks are fine */
  }
  loader.set(0.4);

  smoothScroll.init();
  initCursor();
  initChrome();
  loader.set(0.55);
  await breathe();

  addRunner(initThreshold());
  loader.set(0.72);
  await breathe();

  addRunner(initSpiral());
  initManifesto();
  loader.set(0.86);
  await breathe();

  addRunner(initWhispers());
  addRunner(initVoid());
  loader.set(0.95);
  await breathe();

  // Everything below the fold waits until it is nearly in view. The purchase
  // portal builds a second WebGL stage; Rapier's WebAssembly weighs a couple of
  // megabytes. Neither belongs in the first five seconds of a visit.
  //
  // The exception is a buyer coming back from the payment provider: they land
  // at the top of the page and are owed their receipt, so the portal is built
  // straight away.
  const returning = new URLSearchParams(location.search).has('purchase');
  let portal = null;
  if (returning) {
    portal = initPortal();
    addRunner(portal);
  } else {
    whenNear('#portal', () => addRunner(initPortal()));
  }
  whenNear('.room__stage', async () => {
    try {
      const { initReadingRoom } = await import('./sections/readingRoom.js');
      addRunner(await initReadingRoom());
    } catch (err) {
      console.error('The reading room refused to obey physics.', err);
      document.getElementById('hud-engine').textContent = 'UNAVAILABLE';
      document.getElementById('hud-chaos').textContent = 'SHELF EMPTY';
    }
  });

  // One clock for everybody: sections measure their own deltas from
  // performance.now(), so the ticker must hand them the same time base.
  gsap.ticker.add(() => {
    const now = performance.now();
    for (const frame of running) frame(now);
  });

  ScrollTrigger.refresh();
  loader.set(1);
  await loader.done();

  // Now that the veil has lifted, tell a returning buyer how it went.
  portal?.greetReturningBuyer?.();

  // A quiet invitation, once, for anyone who has not found the sound toggle.
  if (!env.mobile) {
    gsap.fromTo(
      '#audio-toggle',
      { scale: 1 },
      { scale: 1.08, duration: 0.5, yoyo: true, repeat: 3, ease: 'sine.inOut', delay: 2.4 }
    );
  }
}

boot().catch((err) => {
  console.error(err);
  loader.done();
});

// Keep pinned sections honest when the viewport or fonts settle.
window.addEventListener('load', () => ScrollTrigger.refresh());
