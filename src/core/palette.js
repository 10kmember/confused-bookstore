/** The eight colours the whole library is allowed to dream in. */
export const P = {
  cream: '#F1ECE6',
  greige: '#DDD5CD',
  ink: '#2E2E2E',
  rose: '#7D4047',
  gold: '#F4B044',
  night: '#112532',
  ember: '#E0680E',
  slate: '#88A5B7',
};

/** '#F4B044' -> 'rgba(244,176,68,alpha)' */
export function rgba(hex, alpha = 1) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.replace(/./g, (c) => c + c) : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export const hexInt = (hex) => parseInt(hex.replace('#', ''), 16);
