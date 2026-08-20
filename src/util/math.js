export const TAU = Math.PI * 2;

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
export const rand = (min, max) => min + Math.random() * (max - min);
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/** Frame-rate independent lerp factor. */
export const damp = (t, dt, ref = 1 / 60) => 1 - Math.pow(1 - t, dt / ref);

/** Deterministic pseudo-random from a seed — keeps layouts stable across reloads. */
export function seeded(seed) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
