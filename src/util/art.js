import { P, rgba } from '../core/palette.js';
import { book } from '../content/book.js';
import { seeded, TAU } from './math.js';

/**
 * The gallery's "photographs" are drawn, not photographed: interior spreads,
 * diagrams and assorted evidence, generated on a 2D canvas at runtime.
 */

const W = 640;
const H = 840;

/** 'Chadwick P. Worthington III' → 'CPW' */
function initials(name) {
  return name
    .split(/\s+/)
    .filter((word) => word && !/^[IVXLC]+\.?$/i.test(word) && !/^(jr|sr|phd|md)\.?$/i.test(word))
    .slice(0, 3)
    .map((word) => word[0].toUpperCase())
    .join('');
}

let _paper = null;
/** One sheet of aged paper, painted once and stamped onto every plate. */
function paper() {
  if (_paper) return _paper;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.fillStyle = P.cream;
  ctx.fillRect(0, 0, W, H);

  // paper fibre + foxing
  const random = seeded(2247);
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = rgba(random() > 0.5 ? '#c9b9a4' : '#ffffff', 0.05 + random() * 0.08);
    ctx.fillRect(random() * W, random() * H, 1.6, 1.6);
  }
  for (let i = 0; i < 14; i++) {
    const x = random() * W;
    const y = random() * H;
    const r = 12 + random() * 50;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba('#b39169', 0.07));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  _paper = c;
  return c;
}

function sheet() {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d');
  ctx.drawImage(paper(), 0, 0);
  return { c, ctx };
}

/** Ragged blocks of grey "text" — legible as prose, unreadable as words. */
function textBlock(ctx, x, y, w, lines, { size = 7, gap = 13, color = P.ink, alpha = 0.5 } = {}) {
  for (let i = 0; i < lines; i++) {
    const len = i === lines - 1 ? w * (0.4 + Math.random() * 0.35) : w * (0.86 + Math.random() * 0.14);
    ctx.fillStyle = rgba(color, alpha * (0.7 + Math.random() * 0.3));
    ctx.fillRect(x, y + i * gap, len, size * 0.42);
  }
  return y + lines * gap;
}

function heading(ctx, text, x, y, { size = 54, color = P.rose, align = 'left', font = "'Amatic SC', cursive" } = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.font = `700 ${size}px ${font}`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function label(ctx, text, x, y, { size = 11, color = P.slate, align = 'left', spacing = 3 } = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.font = `700 ${size}px Nunito, sans-serif`;
  ctx.letterSpacing = `${spacing}px`;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/* ── individual plates ─────────────────────────────────────── */

function interiorSpread(plate) {
  const { chapter = 1, title = '', figure = 1, caption = '' } = plate;
  const { c, ctx } = sheet();
  ctx.fillStyle = rgba(P.ink, 0.06);
  ctx.fillRect(W / 2 - 1, 40, 2, H - 80); // gutter

  label(ctx, `CHAPTER ${chapter}`, 46, 76);
  heading(ctx, title, 46, 128, { size: 46 });
  let y = textBlock(ctx, 46, 156, W / 2 - 92, 16);
  y = textBlock(ctx, 46, y + 16, W / 2 - 92, 11);

  // right page: the figure
  const fx = W / 2 + 46;
  label(ctx, `FIG. ${figure}`, fx, 76, { color: P.rose });
  ctx.strokeStyle = rgba(P.rose, 0.55);
  ctx.lineWidth = 1.4;
  ctx.strokeRect(fx, 96, W / 2 - 92, 210);

  // an entirely serious diagram
  ctx.save();
  ctx.translate(fx + (W / 2 - 92) / 2, 201);
  ctx.strokeStyle = rgba(P.ink, 0.6);
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.arc(0, 0, 88, 0, TAU);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = P.gold;
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + 0.3;
    ctx.strokeStyle = rgba(P.ember, 0.75);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 88, Math.sin(a) * 88);
    ctx.lineTo(Math.cos(a) * 18, Math.sin(a) * 18);
    ctx.stroke();
    ctx.fillStyle = rgba(P.ember, 0.9);
    ctx.beginPath();
    ctx.arc(Math.cos(a) * 88, Math.sin(a) * 88, 4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  label(ctx, caption, fx, 330, { size: 9, spacing: 2 });
  textBlock(ctx, fx, 356, W / 2 - 92, 22);
  label(ctx, `${chapter * 19}`, W - 46, H - 46, { align: 'right', size: 10, color: P.ink });
  return c;
}

function portraitPlate(plate) {
  const { c, ctx } = sheet();
  ctx.fillStyle = P.night;
  ctx.fillRect(46, 60, W - 92, 520);

  // a man-shaped absence
  const g = ctx.createRadialGradient(W / 2, 300, 20, W / 2, 300, 300);
  g.addColorStop(0, rgba(P.slate, 0.5));
  g.addColorStop(1, rgba(P.night, 0));
  ctx.fillStyle = g;
  ctx.fillRect(46, 60, W - 92, 520);

  ctx.fillStyle = rgba(P.night, 0.92);
  ctx.beginPath();
  ctx.arc(W / 2, 280, 84, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 150, 580);
  ctx.quadraticCurveTo(W / 2, 350, W / 2 + 150, 580);
  ctx.fill();

  // collar + pocket square, because of course
  ctx.strokeStyle = rgba(P.cream, 0.7);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 44, 400);
  ctx.lineTo(W / 2, 452);
  ctx.lineTo(W / 2 + 44, 400);
  ctx.stroke();
  ctx.fillStyle = P.ember;
  ctx.fillRect(W / 2 + 74, 470, 28, 12);

  heading(ctx, book.author, W / 2, 646, { size: 52, align: 'center' });
  label(ctx, book.authorRole.toUpperCase().replace(/, /g, ' · '), W / 2, 682, { align: 'center', size: 10 });
  ctx.font = 'italic 300 15px Nunito, sans-serif';
  ctx.fillStyle = rgba(P.ink, 0.6);
  ctx.textAlign = 'center';
  ctx.fillText(plate.caption || '', W / 2, 720);
  return c;
}

function napkinPlate(plate) {
  const { c, ctx } = sheet();
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-0.06);
  ctx.fillStyle = '#fbf7f1';
  ctx.shadowColor = rgba(P.ink, 0.22);
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 14;
  ctx.fillRect(-230, -230, 460, 460);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = rgba(P.rose, 0.35);
  ctx.lineWidth = 2;
  ctx.strokeRect(-200, -200, 400, 400);

  ctx.fillStyle = rgba(P.rose, 0.8);
  ctx.textAlign = 'center';
  ctx.font = "700 90px 'Amatic SC', cursive";
  ctx.fillText(initials(book.author), 0, -110);

  ctx.font = '300 26px Nunito, sans-serif';
  ctx.fillStyle = rgba(P.ink, 0.8);
  ctx.fillText(plate.scrawl || '', 0, 20);
  ctx.font = "700 34px 'Amatic SC', cursive";
  ctx.fillText(plate.number || '', 0, 74);
  ctx.strokeStyle = rgba(P.ember, 0.9);
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(-160, 66);
  ctx.lineTo(168, 58);
  ctx.stroke();
  ctx.restore();

  label(ctx, plate.label || '', 46, 96, { color: P.rose });
  ctx.font = 'italic 300 15px Nunito, sans-serif';
  ctx.fillStyle = rgba(P.ink, 0.6);
  ctx.textAlign = 'left';
  ctx.fillText(plate.caption || '', 46, H - 62);
  return c;
}

function chartPlate(plate) {
  const { c, ctx } = sheet();
  label(ctx, plate.label || '', 46, 82, { color: P.rose });
  heading(ctx, plate.title || '', 46, 140, { size: 52 });

  const x0 = 90;
  const y0 = 620;
  const x1 = W - 60;
  const y1 = 220;
  ctx.strokeStyle = rgba(P.ink, 0.45);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, y1);
  ctx.lineTo(x0, y0);
  ctx.lineTo(x1, y0);
  ctx.stroke();

  // confidence: up and to the right, forever
  ctx.strokeStyle = P.ember;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 20);
  ctx.quadraticCurveTo((x0 + x1) / 2, y0 - 280, x1 - 10, y1 + 10);
  ctx.stroke();

  // results: a flat line with a single, tragic blip
  ctx.strokeStyle = P.slate;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 26);
  ctx.lineTo(x0 + 210, y0 - 30);
  ctx.lineTo(x0 + 240, y0 - 92);
  ctx.lineTo(x0 + 268, y0 - 28);
  ctx.lineTo(x1 - 10, y0 - 24);
  ctx.stroke();
  ctx.setLineDash([]);

  label(ctx, plate.seriesA || '', x1 - 10, y1 - 6, { align: 'right', color: P.ember, size: 10 });
  label(ctx, plate.seriesB || '', x1 - 10, y0 - 36, { align: 'right', color: P.slate, size: 10 });
  label(ctx, `CHAPTERS 1 → ${book.stats[1]?.value ?? ''}`, x0, y0 + 26, { size: 9, spacing: 2 });
  textBlock(ctx, 46, 690, W - 92, 6);
  return c;
}

function crestPlate(plate) {
  const { c, ctx } = sheet();
  ctx.fillStyle = P.night;
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  ctx.translate(W / 2, H / 2 - 40);
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, 180, 0, TAU);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.arc(0, 0, 200, 0, TAU);
  ctx.stroke();

  // shield
  ctx.beginPath();
  ctx.moveTo(-96, -110);
  ctx.lineTo(96, -110);
  ctx.lineTo(96, 30);
  ctx.quadraticCurveTo(0, 150, -96, 30);
  ctx.closePath();
  ctx.fillStyle = rgba(P.rose, 0.9);
  ctx.fill();
  ctx.strokeStyle = P.gold;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = P.gold;
  ctx.textAlign = 'center';
  ctx.font = "700 120px 'Amatic SC', cursive";
  ctx.fillText(book.monogram, 0, 20);

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 186, Math.sin(a) * 186);
    ctx.lineTo(Math.cos(a) * 196, Math.sin(a) * 196);
    ctx.strokeStyle = rgba(P.gold, 0.6);
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();

  ctx.textAlign = 'center';
  ctx.fillStyle = P.cream;
  ctx.font = "700 44px 'Amatic SC', cursive";
  ctx.fillText(book.imprint.toUpperCase(), W / 2, H - 150);
  ctx.font = '300 15px Nunito, sans-serif';
  ctx.fillStyle = rgba(P.slate, 0.9);
  ctx.fillText(plate.motto || '', W / 2, H - 116);
  return c;
}

function errataPlate(plate) {
  const { c, ctx } = sheet();
  label(ctx, plate.label || '', 46, 88, { color: P.rose });
  heading(ctx, 'Corrections', 46, 150, { size: 56 });
  const items = (plate.items || []).slice(0, 7);
  let y = 210;
  items.forEach(([page, note]) => {
    ctx.fillStyle = P.rose;
    ctx.font = "700 15px Nunito, sans-serif";
    ctx.textAlign = 'left';
    ctx.fillText(page, 46, y);
    ctx.fillStyle = rgba(P.ink, 0.82);
    ctx.font = "400 16px Nunito, sans-serif";
    ctx.fillText(note, 130, y);
    ctx.strokeStyle = rgba(P.ink, 0.12);
    ctx.beginPath();
    ctx.moveTo(46, y + 18);
    ctx.lineTo(W - 46, y + 18);
    ctx.stroke();
    y += 56;
  });
  ctx.save();
  ctx.translate(W - 150, H - 150);
  ctx.rotate(-0.2);
  ctx.strokeStyle = rgba(P.ember, 0.7);
  ctx.lineWidth = 4;
  ctx.strokeRect(-90, -34, 180, 68);
  ctx.fillStyle = rgba(P.ember, 0.75);
  ctx.font = "700 46px 'Amatic SC', cursive";
  ctx.textAlign = 'center';
  ctx.fillText(plate.stamp || '', 0, 14);
  ctx.restore();
  return c;
}

/** Build every plate once and hand back gallery-ready records. */
const RENDERERS = {
  spread: interiorSpread,
  portrait: portraitPlate,
  napkin: napkinPlate,
  chart: chartPlate,
  crest: crestPlate,
  errata: errataPlate,
};

/** A plate that is just a supplied image, mounted on the same aged paper. */
function imagePlate(plate) {
  const { c, ctx } = sheet();
  const img = new Image();
  img.onload = () => {
    // cover-fit inside a margin, so any aspect ratio sits happily on the sheet
    const pad = 34;
    const boxW = W - pad * 2;
    const boxH = H - pad * 2;
    const scale = Math.max(boxW / img.width, boxH / img.height);
    const w = img.width * scale;
    const h = img.height * scale;
    ctx.save();
    ctx.beginPath();
    ctx.rect(pad, pad, boxW, boxH);
    ctx.clip();
    ctx.drawImage(img, pad + (boxW - w) / 2, pad + (boxH - h) / 2, w, h);
    ctx.restore();
    c.dispatchEvent?.(new Event('plate:loaded'));
  };
  img.onerror = () => {
    label(ctx, 'IMAGE NOT FOUND', 46, 96, { color: P.ember });
    heading(ctx, plate.title || 'Missing plate', 46, 160, { size: 46 });
    ctx.font = '300 15px Nunito, sans-serif';
    ctx.fillStyle = rgba(P.ink, 0.6);
    ctx.fillText(plate.image, 46, 200);
  };
  img.src = plate.image;
  return c;
}

/**
 * Build every plate declared in src/content/book.js. Unknown kinds fall back to
 * an interior spread rather than disappearing, so a typo is visible instead of
 * silent.
 */
export function buildGallery() {
  return book.plates.map((plate) => {
    const render = plate.kind === 'image' ? imagePlate : RENDERERS[plate.kind] || interiorSpread;
    return { ...plate, canvas: render(plate) };
  });
}

/** Encode a plate once, the first time something needs an <img> source. */
export function dataURL(item) {
  if (!item.src) item.src = item.canvas.toDataURL('image/webp', 0.86);
  return item.src;
}
