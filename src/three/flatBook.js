import { book } from '../content/book.js';
import { P, rgba } from '../core/palette.js';
import { bookTextures } from './textures.js';
import { fitCanvas } from '../util/env.js';

/**
 * The book without WebGL.
 *
 * Privacy browsers block WebGL, older machines never had it, and drivers fail.
 * When that happens the cover is still drawn — it was always a 2D canvas —
 * so the visitor sees the book they came for, just standing still.
 */
export function drawFlatBook(canvas, { night = false, region = () => ({ x: 0, w: 1 }) } = {}) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const printed = bookTextures().cover.map.image;
  let artwork = null;

  // An uploaded cover arrives on its own schedule; redraw when it does.
  if (book.cover?.image) {
    const img = new Image();
    img.onload = () => {
      artwork = img;
      render();
    };
    img.src = book.cover.image;
  }

  function render() {
    const { w, h } = fitCanvas(canvas, ctx);
    ctx.clearRect(0, 0, w, h);

    const source = artwork || printed;
    if (!source) return;

    // The 3D book is placed by a camera; this one is placed by its caller, so
    // it can sit beside the headline instead of on top of it.
    const band = region();
    const bandX = band.x * w;
    const bandW = band.w * w;

    const ratio = source.width / source.height;
    const boxH = Math.min(h * 0.78, (bandW * 0.74) / ratio);
    const boxW = boxH * ratio;
    const x = bandX + (bandW - boxW) / 2;
    const y = (h - boxH) / 2;
    const cx = x + boxW / 2;

    // a pool of light, so it sits in the room rather than on it
    const glow = ctx.createRadialGradient(cx, h / 2, boxW * 0.2, cx, h / 2, boxW * 1.1);
    glow.addColorStop(0, rgba(P.gold, night ? 0.12 : 0.14));
    glow.addColorStop(1, rgba(P.gold, 0));
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.shadowColor = rgba(P.night, night ? 0.8 : 0.4);
    ctx.shadowBlur = boxW * 0.14;
    ctx.shadowOffsetY = boxH * 0.05;

    // the block of pages, just proud of the boards
    ctx.fillStyle = P.cream;
    ctx.fillRect(x + boxW * 0.012, y + boxH * 0.008, boxW, boxH - boxH * 0.016);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    ctx.drawImage(source, x, y, boxW, boxH);

    // the spine edge
    ctx.fillStyle = rgba(P.night, 0.25);
    ctx.fillRect(x, y, boxW * 0.02, boxH);
    ctx.restore();
  }

  render();
  window.addEventListener('resize', render);
  return { render };
}
