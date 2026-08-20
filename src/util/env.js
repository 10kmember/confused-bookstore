/** Runtime capability detection — everything downstream scales off this. */

const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
const mqCoarse = window.matchMedia('(pointer: coarse)');

export const env = {
  get reduced() {
    return mqReduce.matches;
  },
  get coarse() {
    return mqCoarse.matches;
  },
  get width() {
    return window.innerWidth;
  },
  get mobile() {
    return window.innerWidth < 720 || mqCoarse.matches;
  },
  get tablet() {
    return window.innerWidth >= 720 && window.innerWidth < 1100;
  },
  get dpr() {
    return Math.min(window.devicePixelRatio || 1, env.mobile ? 2 : 2.5);
  },
};

/** Quality tier: 0 = mobile fallback, 1 = tablet, 2 = full desktop dream. */
export function tier() {
  if (env.reduced) return 0;
  if (env.mobile) return 0;
  if (env.tablet) return 1;
  return 2;
}

/** Size a canvas to its CSS box at the current DPR. Returns {w,h} in CSS px. */
export function fitCanvas(canvas, ctx) {
  const rect = canvas.getBoundingClientRect();
  const dpr = env.dpr;
  const w = Math.max(1, Math.round(rect.width));
  const h = Math.max(1, Math.round(rect.height));
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { w, h, dpr };
}
