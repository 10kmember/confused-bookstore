import lottie from 'lottie-web/build/player/esm/lottie_light.min.js';
import { P } from './palette.js';

/**
 * Hand-authored Lottie (Bodymovin) data, built in JS so the keyframes stay
 * readable and the palette stays in one place. Two icons ship: the ambient
 * sound toggle and the little flag that marks a whisper.
 */

const rgb = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, 1];
};

const EASE_IN = { x: [0.4], y: [0] };
const EASE_OUT = { x: [0.2], y: [1] };

/** Static (non-animated) property. */
const val = (k) => ({ a: 0, k });

/** Animated property from [[frame, value], …]. */
const keys = (frames) =>
  ({
    a: 1,
    k: frames.map(([t, s], i) => {
      const kf = { t, s: Array.isArray(s) ? s : [s] };
      if (i < frames.length - 1) {
        kf.i = EASE_OUT;
        kf.o = EASE_IN;
      }
      return kf;
    }),
  });

const transform = ({ p = [0, 0], s = [100, 100], r = 0, o = 100, a = [0, 0] } = {}) => ({
  ty: 'tr',
  p: Array.isArray(p) ? val(p) : p,
  a: val(a),
  s: Array.isArray(s) ? val(s) : s,
  r: typeof r === 'number' ? val(r) : r,
  o: typeof o === 'number' ? val(o) : o,
});

const fill = (hex, o = 100) => ({ ty: 'fl', c: val(rgb(hex)), o: val(o), r: 1 });
const stroke = (hex, w = 2, o = 100) => ({
  ty: 'st',
  c: val(rgb(hex)),
  o: val(o),
  w: val(w),
  lc: 2,
  lj: 2,
});

const path = (points, closed = true) => ({
  ty: 'sh',
  ks: val({
    i: points.map(() => [0, 0]),
    o: points.map(() => [0, 0]),
    v: points,
    c: closed,
  }),
});

const group = (items, tr = {}) => ({ ty: 'gr', it: [...items, transform(tr)] });

const layer = (shapes, { ind = 1, op = 60, ks = {} } = {}) => ({
  ddd: 0,
  ind,
  ty: 4,
  nm: `l${ind}`,
  sr: 1,
  ao: 0,
  ip: 0,
  op,
  st: 0,
  ks: {
    o: val(100),
    r: val(0),
    p: val([32, 32, 0]),
    a: val([0, 0, 0]),
    s: val([100, 100, 100]),
    ...ks,
  },
  shapes,
});

const animation = (layers, { fr = 60, op = 60, w = 64, h = 64 } = {}) => ({
  v: '5.9.0',
  fr,
  ip: 0,
  op,
  w,
  h,
  nm: 'confused-icon',
  ddd: 0,
  assets: [],
  layers,
});

/** Speaker cone with two waves that ripple outward. */
export function speakerData() {
  const cone = group([
    path([
      [-14, -5],
      [-6, -5],
      [3, -14],
      [3, 14],
      [-6, 5],
      [-14, 5],
    ]),
    fill(P.gold),
  ]);

  const wave = (radius, ind) =>
    group(
      [
        path(
          [
            [0, -radius],
            [radius * 0.72, -radius * 0.72],
            [radius, 0],
            [radius * 0.72, radius * 0.72],
            [0, radius],
          ],
          false
        ),
        stroke(P.gold, 3),
      ],
      {
        p: [4, 0],
        o: keys([
          [ind * 10, 0],
          [ind * 10 + 14, 100],
          [ind * 10 + 40, 0],
        ]),
        s: keys([
          [ind * 10, [70, 70]],
          [ind * 10 + 40, [110, 110]],
        ]),
      }
    );

  return animation([layer([cone, wave(9, 1), wave(15, 2)], { op: 70 })], { op: 70 });
}

/** A pennant on a pole, waving gently. */
export function flagData() {
  const pole = group([
    path([
      [-1.4, -18],
      [1.4, -18],
      [1.4, 18],
      [-1.4, 18],
    ]),
    fill(P.slate),
  ]);
  const pennant = group(
    [
      path([
        [0, -17],
        [20, -9],
        [0, -1],
      ]),
      fill(P.gold),
    ],
    {
      a: [0, -9],
      s: keys([
        [0, [100, 100]],
        [30, [72, 108]],
        [60, [100, 100]],
      ]),
      r: keys([
        [0, -3],
        [30, 5],
        [60, -3],
      ]),
    }
  );
  return animation([layer([pole, pennant], { op: 60 })]);
}

/** Mount an animation into `el`. Returns the lottie instance. */
export function mountIcon(el, data, { loop = true, autoplay = true } = {}) {
  if (!el) return null;
  return lottie.loadAnimation({
    container: el,
    renderer: 'svg',
    loop,
    autoplay,
    animationData: data,
    rendererSettings: { preserveAspectRatio: 'xMidYMid meet' },
  });
}
