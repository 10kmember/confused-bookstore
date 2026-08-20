import * as THREE from 'three';
import { P, rgba } from '../core/palette.js';
import { book } from '../content/book.js';
import { seeded } from '../util/math.js';

/**
 * Every surface in this library is drawn at runtime on a 2D canvas — no image
 * assets ship with the site. Leather grain, foil stamping and page edges are
 * all procedural, which keeps the palette authoritative and the payload small.
 */

const canvas2d = (w, h) => {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
};

const toTexture = (canvas, { srgb = true, repeat = null } = {}) => {
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
  }
  return tex;
};

/**
 * Draw text that must not run off the boards: if it is too wide for the space,
 * the point size steps down until it fits. Callers set the font first.
 */
function stamp(ctx, text, x, y, maxWidth) {
  const width = ctx.measureText(text).width;
  if (width > maxWidth) {
    const px = Number(ctx.font.match(/([\d.]+)px/)?.[1]);
    if (px) ctx.font = ctx.font.replace(/[\d.]+px/, `${px * (maxWidth / width)}px`);
  }
  ctx.fillText(text, x, y);
}

/** Speckled, slightly blotchy leather in Vintage Rosewood. */
function paintLeather(ctx, w, h, base = P.rose) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  const random = seeded(9317);
  // broad tonal blotches
  for (let i = 0; i < 120; i++) {
    const r = random() * w * 0.16 + 10;
    const x = random() * w;
    const y = random() * h;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    const dark = random() > 0.5;
    g.addColorStop(0, rgba(dark ? '#3a1c20' : '#a05a61', 0.09));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // fine grain, tiled from a small cached patch — a per-pixel pass over a
  // megapixel canvas costs whole seconds on a modest machine
  ctx.save();
  ctx.globalAlpha = 0.5;
  ctx.fillStyle = ctx.createPattern(grainTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

let _grain = null;
/** 256² of monochrome noise, generated once and reused by every surface. */
function grainTile() {
  if (_grain) return _grain;
  const [c, ctx] = canvas2d(256, 256);
  const img = ctx.createImageData(256, 256);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = 128 + (Math.random() - 0.5) * 46;
    d[i] = n;
    d[i + 1] = n;
    d[i + 2] = n;
    d[i + 3] = 42;
  }
  ctx.putImageData(img, 0, 0);
  _grain = c;
  return c;
}

/** Front cover artwork: foil-stamped title on leather. */
export function bookCoverTextures({ size = 768 } = {}) {
  const w = size;
  const h = Math.round(size * 1.45);
  const [colorCanvas, ctx] = canvas2d(w, h);
  paintLeather(ctx, w, h);

  // ── the foil is drawn three times: in colour, as a metal/roughness mask, and
  //    as an emissive mask so the stamping catches light like real gold leaf ──
  const [maskCanvas, mctx] = canvas2d(w, h);
  mctx.fillStyle = 'rgb(0,214,0)'; // G = roughness 0.84, B = metalness 0
  mctx.fillRect(0, 0, w, h);

  const [glowCanvas, gctx] = canvas2d(w, h);
  gctx.fillStyle = '#000000';
  gctx.fillRect(0, 0, w, h);

  const foil = (fn) => {
    fn(ctx, P.gold);
    fn(mctx, 'rgb(0,44,255)'); // G = roughness 0.17, B = metalness 1
    fn(gctx, P.gold);
  };

  const m = w * 0.1;

  foil((c, color) => {
    c.strokeStyle = color;
    c.lineWidth = w * 0.008;
    c.strokeRect(m, m, w - m * 2, h - m * 2);
    c.lineWidth = w * 0.003;
    c.strokeRect(m * 1.28, m * 1.28, w - m * 2.56, h - m * 2.56);
  });

  // Stamped line by line from src/content/book.js, and the type steps down to
  // fit however many lines — and however long a line — the book happens to have.
  const lines = book.titleLines.map((line) => line.toUpperCase());
  const lineStep = h * (lines.length > 4 ? 0.086 : 0.105);
  const titleSize = Math.min(w * 0.155, lineStep * 1.35);
  const titleTop = h * 0.5 - ((lines.length - 1) * lineStep) / 2;

  // Nothing is stamped wider than the inner rule — cross it and the type reads
  // as a mistake rather than as foil.
  const column = w - m * 2.56 - w * 0.04;

  foil((c, color) => {
    c.fillStyle = color;
    c.textAlign = 'center';

    lines.forEach((line, i) => {
      c.font = `700 ${titleSize}px 'Amatic SC', cursive`;
      stamp(c, line, w / 2, titleTop + i * lineStep, column);
    });

    c.font = `400 ${w * 0.042}px Nunito, sans-serif`;
    stamp(c, book.subtitle.toUpperCase(), w / 2, h * 0.795, column);

    c.font = `700 ${w * 0.05}px Nunito, sans-serif`;
    stamp(c, book.author.toUpperCase(), w / 2, h * 0.86, column);

    // a small, extremely serious crest
    c.beginPath();
    c.arc(w / 2, h * 0.245, w * 0.045, 0, Math.PI * 2);
    c.lineWidth = w * 0.006;
    c.strokeStyle = color;
    c.stroke();
    c.font = `700 ${w * 0.05}px 'Amatic SC', cursive`;
    stamp(c, book.monogram, w / 2, h * 0.26, w * 0.07);
  });

  return {
    map: toTexture(colorCanvas),
    metalRough: toTexture(maskCanvas, { srgb: false }),
    glow: toTexture(glowCanvas),
  };
}

/** Plain leather for the back cover and spine. */
export function leatherTexture() {
  const [c, ctx] = canvas2d(512, 512);
  paintLeather(ctx, 512, 512);
  return toTexture(c);
}

/** Spine: gold rules and vertical title. */
export function spineTexture() {
  const w = 256;
  const h = 1024;
  const [c, ctx] = canvas2d(w, h);
  paintLeather(ctx, w, h);
  ctx.fillStyle = P.gold;
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 5;
  [0.12, 0.16, 0.8, 0.84].forEach((y) => {
    ctx.beginPath();
    ctx.moveTo(w * 0.16, h * y);
    ctx.lineTo(w * 0.84, h * y);
    ctx.stroke();
  });
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.font = `700 ${w * 0.42}px 'Amatic SC', cursive`;
  stamp(ctx, book.title.toUpperCase(), 0, w * 0.16, h * 0.82);
  ctx.restore();
  return toTexture(c);
}

/** The cream block of pages, with edge striations. */
export function pagesTexture() {
  const [c, ctx] = canvas2d(512, 512);
  ctx.fillStyle = P.cream;
  ctx.fillRect(0, 0, 512, 512);
  for (let x = 0; x < 512; x += 2) {
    ctx.strokeStyle = rgba(P.ink, 0.03 + Math.random() * 0.06);
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 512);
    ctx.stroke();
  }
  ctx.fillStyle = rgba('#b9a892', 0.22);
  ctx.fillRect(0, 0, 512, 30);
  ctx.fillRect(0, 482, 512, 30);
  return toTexture(c, { repeat: [1, 1] });
}

const _sparks = new Map();
/** Soft radial blob used for particles and glows. */
export function sparkTexture(color = P.gold) {
  if (_sparks.has(color)) return _sparks.get(color);
  const [c, ctx] = canvas2d(128, 128);
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, rgba(color, 1));
  g.addColorStop(0.35, rgba(color, 0.4));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = toTexture(c);
  _sparks.set(color, tex);
  return tex;
}


/**
 * Swap a drawn texture for an uploaded image once it arrives. The book is on
 * screen from the first frame either way; the artwork simply replaces the
 * stamping when the file has loaded.
 */
function useImage(url, texture) {
  new THREE.TextureLoader().load(
    url,
    (loaded) => {
      texture.image = loaded.image;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    },
    undefined,
    () => console.warn(`Artwork could not be loaded: ${url}`)
  );
}

let _bookTextures = null;
/**
 * The hero and the purchase portal show the same book; generating (and
 * uploading) these surfaces twice was the single most expensive thing the
 * page did, so the set is built once and shared.
 */
export function bookTextures() {
  if (_bookTextures) return _bookTextures;

  const cover = bookCoverTextures();
  const spine = spineTexture();

  // An uploaded cover is printed artwork, not foil on leather, so it drops the
  // metal and emissive masks and reads as ink on board instead.
  const printed = Boolean(book.cover?.image);
  if (printed) useImage(book.cover.image, cover.map);
  if (book.cover?.spineImage) useImage(book.cover.spineImage, spine);

  _bookTextures = {
    cover: { ...cover, printed },
    leather: leatherTexture(),
    spine,
    pages: pagesTexture(),
  };
  return _bookTextures;
}
