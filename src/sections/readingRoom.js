import gsap from 'gsap';
import ScrollTrigger from 'gsap/ScrollTrigger';
import { P, rgba } from '../core/palette.js';
import { audio } from '../core/audio.js';
import { env, fitCanvas, tier } from '../util/env.js';
import { clamp, pick, rand, TAU } from '../util/math.js';

/* ═══════════════ 02 — THE PHYSICS READING ROOM ═══════════════ */

const PPM = 64; // pixels per physics metre
const KINDS = ['quill', 'ink', 'bookmark', 'cup', 'crumple', 'spectacles'];

/**
 * A desk that obeys Rapier. The engine is imported lazily — its WebAssembly is
 * about two megabytes, and nobody should pay for it before they scroll here.
 */
export async function initReadingRoom() {
  const canvas = document.getElementById('room-canvas');
  const stage = canvas.parentElement;
  canvas.dataset.physics = '';
  const ctx = canvas.getContext('2d');

  const hud = {
    objects: document.getElementById('hud-objects'),
    gravity: document.getElementById('hud-gravity'),
    chaos: document.getElementById('hud-chaos'),
  };

  let W = 0;
  let H = 0;
  ({ w: W, h: H } = fitCanvas(canvas, ctx));

  const RAPIER = (await import('@dimforge/rapier2d-compat')).default;
  await RAPIER.init();
  document.getElementById('hud-engine').textContent = 'RAPIER 2D';

  let gravitySign = 1;
  const world = new RAPIER.World({ x: 0, y: 9.81 });
  const events = new RAPIER.EventQueue(true);
  const bodies = [];
  let walls = [];

  /* ── the room's boundaries ─────────────────────────────── */
  function buildWalls() {
    walls.forEach((w) => world.removeRigidBody(w));
    const w = W / PPM;
    const h = H / PPM;
    const t = 1;
    const make = (x, y, hx, hy) => {
      const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y));
      world.createCollider(RAPIER.ColliderDesc.cuboid(hx, hy).setRestitution(0.32).setFriction(0.7), body);
      return body;
    };
    walls = [
      make(w / 2, h + t - 0.3, w / 2 + t, t), // desk top, a little above the frame
      make(w / 2, -t - 4, w / 2 + t, t), // distant ceiling
      make(-t, h / 2, t, h * 2), // left
      make(w + t, h / 2, t, h * 2), // right
    ];
  }
  buildWalls();

  /* ── props ─────────────────────────────────────────────── */
  const SHAPES = {
    quill: { hx: 0.06, hy: 0.42, density: 0.5, restitution: 0.35 },
    ink: { hx: 0.16, hy: 0.19, density: 2.4, restitution: 0.18 },
    bookmark: { hx: 0.05, hy: 0.34, density: 0.4, restitution: 0.4 },
    cup: { r: 0.21, density: 1.2, restitution: 0.42 },
    crumple: { r: 0.14, density: 0.35, restitution: 0.62 },
    spectacles: { hx: 0.26, hy: 0.08, density: 0.6, restitution: 0.5 },
    book: { hx: 0.42, hy: 0.56, density: 9, restitution: 0.08 },
  };

  function spawn(kind, x, y, { spin = 0 } = {}) {
    const shape = SHAPES[kind];
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, y)
        .setRotation(rand(-0.6, 0.6))
        .setAngvel(spin)
        .setLinearDamping(0.22)
        .setAngularDamping(0.5)
    );
    const desc = shape.r
      ? RAPIER.ColliderDesc.ball(shape.r)
      : RAPIER.ColliderDesc.roundCuboid(shape.hx * 0.86, shape.hy * 0.86, 0.03);
    desc
      .setDensity(shape.density)
      .setRestitution(shape.restitution)
      .setFriction(0.6)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS);
    const collider = world.createCollider(desc, body);
    const record = {
      kind,
      body,
      collider,
      handle: collider.handle,
      hue: kind === 'crumple' ? P.cream : pick([P.rose, P.gold, P.ember, P.slate, P.greige]),
      seed: Math.random(),
      shape,
    };
    bodies.push(record);
    return record;
  }

  /** The book: heavier than everything else, and magnetically attached to the middle. */
  const hero = spawn('book', W / PPM / 2, H / PPM / 2);
  hero.hero = true;

  function litter(count = 12) {
    for (let i = 0; i < count; i++) {
      spawn(pick(KINDS), rand(0.8, W / PPM - 0.8), rand(-3.5, -0.4), { spin: rand(-4, 4) });
    }
    trimPopulation();
  }

  function trimPopulation() {
    const cap = tier() === 2 ? 46 : tier() === 1 ? 30 : 20;
    while (bodies.length > cap) {
      const victim = bodies.findIndex((b) => !b.hero);
      if (victim < 0) break;
      world.removeRigidBody(bodies[victim].body);
      bodies.splice(victim, 1);
    }
  }

  /* ── pointer: grab, drag, detonate ─────────────────────── */
  const pointer = { x: 0, y: 0, down: false, dragging: null, moved: 0 };

  const toWorld = (e) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * (W / PPM),
      y: ((e.clientY - rect.top) / rect.height) * (H / PPM),
    };
  };

  function bodyAt(point) {
    let found = null;
    world.intersectionsWithPoint(point, (collider) => {
      found = bodies.find((b) => b.handle === collider.handle) || null;
      return !found; // keep searching until we recognise one
    });
    return found;
  }

  function blast(point, force = 1) {
    audio.blast();
    let touched = 0;
    for (const b of bodies) {
      const t = b.body.translation();
      const dx = t.x - point.x;
      const dy = t.y - point.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 3.2) continue;
      const falloff = (1 - dist / 3.2) ** 2;
      const mass = b.body.mass();
      const power = force * falloff * mass * 9;
      b.body.applyImpulse({ x: (dx / (dist || 1)) * power, y: (dy / (dist || 1)) * power - power * 0.35 }, true);
      b.body.applyTorqueImpulse(rand(-1, 1) * power * 0.12, true);
      touched++;
    }
    ripples.push({ x: point.x, y: point.y, r: 0, life: 1 });
    return touched;
  }

  const ripples = [];

  canvas.addEventListener('pointerdown', (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = toWorld(e);
    pointer.down = true;
    pointer.moved = 0;
    pointer.x = p.x;
    pointer.y = p.y;
    if (!env.coarse) {
      pointer.dragging = bodyAt(p);
      if (pointer.dragging) pointer.dragging.body.setLinearDamping(3.4);
    }
  });

  canvas.addEventListener('pointermove', (e) => {
    const p = toWorld(e);
    pointer.moved += Math.hypot(p.x - pointer.x, p.y - pointer.y);
    pointer.x = p.x;
    pointer.y = p.y;
  });

  const release = () => {
    if (pointer.dragging) pointer.dragging.body.setLinearDamping(0.22);
    pointer.dragging = null;
    pointer.down = false;
  };

  canvas.addEventListener('pointerup', (e) => {
    if (pointer.down && !pointer.dragging && pointer.moved < 0.25) blast(toWorld(e), 1);
    release();
  });
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);

  /* ── controls ──────────────────────────────────────────── */
  document.getElementById('room-rain').addEventListener('click', () => litter(10));
  document.getElementById('room-gravity').addEventListener('click', (e) => {
    gravitySign *= -1;
    world.gravity = { x: 0, y: 9.81 * gravitySign };
    hud.gravity.textContent = (9.81 * gravitySign).toFixed(2);
    e.currentTarget.textContent = gravitySign > 0 ? 'Invert gravity' : 'Restore gravity';
    bodies.forEach((b) => b.body.wakeUp());
  });
  document.getElementById('room-reset').addEventListener('click', () => {
    for (let i = bodies.length - 1; i >= 0; i--) {
      if (bodies[i].hero) continue;
      world.removeRigidBody(bodies[i].body);
      bodies.splice(i, 1);
    }
    hero.body.setTranslation({ x: W / PPM / 2, y: H / PPM / 2 }, true);
    hero.body.setLinvel({ x: 0, y: 0 }, true);
    hero.body.setAngvel(0, true);
    litter(8);
  });

  /* ── rain on first arrival ─────────────────────────────── */
  let seeded = false;
  ScrollTrigger.create({
    trigger: stage,
    start: 'top 75%',
    onEnter: () => {
      if (seeded) return;
      seeded = true;
      litter(tier() === 2 ? 16 : 9);
      gsap.fromTo(stage, { opacity: 0.4 }, { opacity: 1, duration: 1.2, ease: 'power2.out' });
    },
  });

  const visible = { value: false };
  new IntersectionObserver(
    (entries) => (visible.value = entries[0].isIntersecting),
    { rootMargin: '150px' }
  ).observe(stage);

  window.addEventListener('resize', () => {
    ({ w: W, h: H } = fitCanvas(canvas, ctx));
    buildWalls();
  });

  /* ── drawing ───────────────────────────────────────────── */
  const dust = Array.from({ length: tier() === 2 ? 70 : 30 }, () => ({
    x: Math.random(),
    y: Math.random(),
    r: rand(0.4, 1.7),
    v: rand(0.02, 0.09),
    a: rand(0.08, 0.4),
  }));

  function drawBackdrop(t) {
    ctx.clearRect(0, 0, W, H);

    // a shaft of lamplight from the top left
    ctx.save();
    const beam = ctx.createLinearGradient(W * 0.08, 0, W * 0.62, H);
    beam.addColorStop(0, rgba(P.gold, 0.16));
    beam.addColorStop(0.6, rgba(P.gold, 0.03));
    beam.addColorStop(1, rgba(P.gold, 0));
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(W * 0.02, 0);
    ctx.lineTo(W * 0.42, 0);
    ctx.lineTo(W * 0.86, H);
    ctx.lineTo(W * 0.16, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // dust motes riding the beam
    for (const d of dust) {
      d.y -= d.v / 100;
      if (d.y < -0.02) {
        d.y = 1.02;
        d.x = Math.random();
      }
      const x = (d.x * 0.8 + 0.06 + d.y * 0.18) * W;
      ctx.fillStyle = rgba(P.cream, d.a * (0.4 + Math.sin(t * 0.001 + d.x * 12) * 0.3));
      ctx.beginPath();
      ctx.arc(x, d.y * H, d.r, 0, TAU);
      ctx.fill();
    }

    // the desk surface
    ctx.fillStyle = rgba('#0a1720', 0.55);
    ctx.fillRect(0, H - 10, W, 10);
    ctx.strokeStyle = rgba(P.gold, 0.18);
    ctx.beginPath();
    ctx.moveTo(0, H - 10);
    ctx.lineTo(W, H - 10);
    ctx.stroke();
  }

  function drawProp(rec) {
    const t = rec.body.translation();
    const r = rec.body.rotation();
    ctx.save();
    ctx.translate(t.x * PPM, t.y * PPM);
    ctx.rotate(r);

    const s = rec.shape;
    switch (rec.kind) {
      case 'book': {
        const w = s.hx * 2 * PPM;
        const h = s.hy * 2 * PPM;
        ctx.shadowColor = rgba(P.gold, 0.55);
        ctx.shadowBlur = 26;
        ctx.fillStyle = P.cream;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 3);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = P.rose;
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w * 0.16, h, [3, 0, 0, 3]);
        ctx.fill();
        ctx.strokeStyle = rgba(P.gold, 0.9);
        ctx.lineWidth = 1.4;
        ctx.strokeRect(-w / 2 + w * 0.26, -h / 2 + h * 0.12, w * 0.6, h * 0.76);
        ctx.fillStyle = rgba(P.rose, 0.85);
        ctx.font = `700 ${h * 0.13}px 'Amatic SC', cursive`;
        ctx.textAlign = 'center';
        ctx.fillText('HOW TO', 0 + w * 0.06, -h * 0.06);
        ctx.fillText('BAG A…', 0 + w * 0.06, h * 0.1);
        break;
      }
      case 'quill': {
        const h = s.hy * 2 * PPM;
        ctx.fillStyle = P.cream;
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.quadraticCurveTo(-8, 0, -3, -h / 2);
        ctx.quadraticCurveTo(6, -h * 0.1, 1, h / 2);
        ctx.fill();
        ctx.strokeStyle = rgba(P.rose, 0.7);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = P.ink;
        ctx.beginPath();
        ctx.moveTo(-2, h / 2 - 6);
        ctx.lineTo(2, h / 2 - 6);
        ctx.lineTo(0, h / 2 + 4);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'ink': {
        const w = s.hx * 2 * PPM;
        const h = s.hy * 2 * PPM;
        ctx.fillStyle = rgba(P.night, 0.95);
        ctx.beginPath();
        ctx.roundRect(-w / 2, -h / 2, w, h, 4);
        ctx.fill();
        ctx.strokeStyle = rgba(P.slate, 0.7);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = rec.hue;
        ctx.fillRect(-w * 0.16, -h / 2 - 5, w * 0.32, 6);
        ctx.fillStyle = rgba(P.slate, 0.5);
        ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w * 0.2, h * 0.5);
        break;
      }
      case 'bookmark': {
        const w = s.hx * 2 * PPM;
        const h = s.hy * 2 * PPM;
        ctx.fillStyle = rec.hue;
        ctx.beginPath();
        ctx.moveTo(-w / 2, -h / 2);
        ctx.lineTo(w / 2, -h / 2);
        ctx.lineTo(w / 2, h / 2);
        ctx.lineTo(0, h / 2 - 6);
        ctx.lineTo(-w / 2, h / 2);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case 'cup': {
        const r = s.r * PPM;
        ctx.fillStyle = P.cream;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(P.ink, 0.35);
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.fillStyle = rgba('#4a2c1a', 0.9);
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.62, 0, TAU);
        ctx.fill();
        ctx.strokeStyle = rgba(P.ink, 0.3);
        ctx.beginPath();
        ctx.arc(r * 1.05, 0, r * 0.34, -1.1, 1.1);
        ctx.stroke();
        break;
      }
      case 'crumple': {
        const r = s.r * PPM;
        ctx.fillStyle = P.cream;
        ctx.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * TAU;
          const rr = r * (0.72 + ((rec.seed * (i + 3)) % 1) * 0.5);
          ctx[i ? 'lineTo' : 'moveTo'](Math.cos(a) * rr, Math.sin(a) * rr);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = rgba(P.ink, 0.25);
        ctx.lineWidth = 0.8;
        ctx.stroke();
        break;
      }
      case 'spectacles': {
        const w = s.hx * 2 * PPM;
        ctx.strokeStyle = P.gold;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(-w * 0.26, 0, w * 0.2, 0, TAU);
        ctx.moveTo(w * 0.46, 0);
        ctx.arc(w * 0.26, 0, w * 0.2, 0, TAU);
        ctx.moveTo(-w * 0.06, 0);
        ctx.lineTo(w * 0.06, 0);
        ctx.stroke();
        break;
      }
      default:
        break;
    }
    ctx.restore();
  }

  /* ── the loop ──────────────────────────────────────────── */
  let chaos = 0;
  let accumulator = 0;
  let lastFrame = performance.now();
  const STEP = 1 / 60;
  const heroHome = () => ({ x: W / PPM / 2, y: H / PPM / 2 });

  function frame(now) {
    // Rapier advances a fixed 1/60s per step, so a slow machine would run the
    // desk in slow motion. Catch up with real time, but never more than three
    // steps at once — falling behind must not turn into a death spiral.
    const elapsed = Math.min((now - lastFrame) / 1000, 0.25);
    lastFrame = now;
    if (!visible.value) return;
    accumulator = Math.min(accumulator + elapsed, STEP * 3);

    /** Forces that must be re-applied for every physics step we take. */
    const applyForces = () => {
      // drag: pull the held body toward the cursor with a damped spring
      if (pointer.dragging) {
        const b = pointer.dragging.body;
        const t = b.translation();
        const v = b.linvel();
        const m = b.mass();
        b.applyImpulse(
          {
            x: ((pointer.x - t.x) * 26 - v.x * 4) * m * 0.06,
            y: ((pointer.y - t.y) * 26 - v.y * 4) * m * 0.06,
          },
          true
        );
      }

      // the book is magnetic: it always drifts back to the middle of the desk
      if (pointer.dragging === hero) return;
      const home = heroHome();
      const ht = hero.body.translation();
      const hv = hero.body.linvel();
      hero.body.applyImpulse(
        {
          x: ((home.x - ht.x) * 3.4 - hv.x * 1.1) * hero.body.mass() * 0.05,
          y: ((home.y - ht.y) * 3.4 - hv.y * 1.1) * hero.body.mass() * 0.05,
        },
        true
      );
    };

    let steps = 0;
    while (accumulator >= STEP && steps < 3) {
      applyForces();
      world.step(events);
      accumulator -= STEP;
      steps++;
    }

    events.drainCollisionEvents((h1, h2, started) => {
      if (!started) return;
      const rec = bodies.find((b) => b.handle === h1 || b.handle === h2);
      if (!rec) return;
      const v = rec.body.linvel();
      const speed = Math.hypot(v.x, v.y);
      if (speed > 1.4) audio.thud(clamp(speed / 9, 0.05, 1));
    });

    // anything that escapes the room is quietly reshelved
    for (let i = bodies.length - 1; i >= 0; i--) {
      const b = bodies[i];
      if (b.hero) continue;
      const t = b.body.translation();
      if (t.y > H / PPM + 6 || t.y < -14 || t.x < -6 || t.x > W / PPM + 6) {
        world.removeRigidBody(b.body);
        bodies.splice(i, 1);
      }
    }

    drawBackdrop(now);

    // blast ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 4.5;
      r.life -= 0.04;
      if (r.life <= 0) {
        ripples.splice(i, 1);
        continue;
      }
      ctx.strokeStyle = rgba(P.ember, r.life * 0.6);
      ctx.lineWidth = 2 * r.life;
      ctx.beginPath();
      ctx.arc(r.x * PPM, r.y * PPM, r.r, 0, TAU);
      ctx.stroke();
    }

    bodies.forEach(drawProp);

    // ── HUD ──
    let energy = 0;
    for (const b of bodies) {
      const v = b.body.linvel();
      energy += (v.x * v.x + v.y * v.y) * b.body.mass();
    }
    chaos = chaos * 0.92 + energy * 0.08;
    hud.objects.textContent = String(bodies.length).padStart(2, '0');
    hud.chaos.textContent =
      chaos < 6 ? 'DORMANT' : chaos < 60 ? 'MODERATE' : chaos < 300 ? 'SPIRITED' : 'UNACCEPTABLE';
  }

  return { frame, litter, blast };
}
