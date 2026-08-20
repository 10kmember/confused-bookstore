import * as THREE from 'three';
import { bookTextures, sparkTexture } from './textures.js';
import { hexInt, P } from '../core/palette.js';
import { clamp } from '../util/math.js';

const W = 1.0; // cover width
const H = 1.45; // cover height
const D = 0.24; // spine depth
const T = 0.022; // board thickness

/**
 * The book itself: leather boards, a foil-stamped front, a titled spine and a
 * cream block of pages. Assembled from primitives so it needs no model file.
 */
export function createBook({ scale = 1 } = {}) {
  const group = new THREE.Group();

  const { cover, leather, spine: spineMap, pages } = bookTextures();

  const leatherMat = () =>
    new THREE.MeshStandardMaterial({
      map: leather,
      color: 0xffffff,
      roughness: 0.72,
      metalness: 0.06,
    });

  // Uploaded artwork is ink on board; the drawn cover is gold leaf on leather.
  // Polished metal reflects the room and little else, which leaves foil looking
  // like dark paint, so the stamped areas get a gentle emissive pass to give
  // them the glow they have under a reading lamp.
  const frontMat = cover.printed
    ? new THREE.MeshStandardMaterial({
        map: cover.map,
        roughness: 0.58,
        metalness: 0.04,
        envMapIntensity: 0.8,
      })
    : new THREE.MeshStandardMaterial({
        map: cover.map,
        metalnessMap: cover.metalRough,
        roughnessMap: cover.metalRough,
        emissive: 0xffffff,
        emissiveMap: cover.glow,
        emissiveIntensity: 0.42,
        metalness: 1,
        roughness: 1,
        envMapIntensity: 2.1,
      });

  const spineMat = new THREE.MeshStandardMaterial({
    map: spineMap,
    metalness: 0.25,
    roughness: 0.6,
  });

  // BoxGeometry face order: +x, -x, +y, -y, +z, -z
  const front = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), [
    leatherMat(),
    leatherMat(),
    leatherMat(),
    leatherMat(),
    frontMat,
    leatherMat(),
  ]);
  front.position.z = D / 2 - T / 2;

  const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, T), leatherMat());
  back.position.z = -D / 2 + T / 2;

  const spine = new THREE.Mesh(new THREE.BoxGeometry(T, H, D), [
    leatherMat(),
    spineMat,
    leatherMat(),
    leatherMat(),
    leatherMat(),
    leatherMat(),
  ]);
  spine.position.x = -W / 2 + T / 2;

  const pageMat = new THREE.MeshStandardMaterial({
    map: pages,
    color: hexInt(P.cream),
    roughness: 0.95,
    metalness: 0,
  });
  const block = new THREE.Mesh(
    new THREE.BoxGeometry(W - T * 2.2, H - 0.045, D - T * 2.4),
    pageMat
  );
  block.position.x = T * 0.6;

  [front, back, spine, block].forEach((m) => group.add(m));

  group.scale.setScalar(scale);
  return group;
}

/**
 * The pool of gold behind the book. It lives in the scene rather than in the
 * book's group: parented to the book it would swing round with every tumble
 * and end up washing out the cover it is meant to sit behind.
 */
export function createHalo({ opacity = 0.28, size = 3.4 } = {}) {
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: sparkTexture(P.gold),
      color: hexInt(P.gold),
      transparent: true,
      opacity,
      // Depth test stays on: transparent objects draw after opaque ones, so a
      // depth-blind additive sprite would paint straight over the cover.
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  halo.scale.setScalar(size);
  return halo;
}

/**
 * Drag to rotate, flick to throw. The book carries angular momentum, tumbles
 * with damping, and is always pulled back to the centre by a magnetic spring —
 * exactly the "toss it, it comes home" behaviour the brief asks for.
 */
export class BookController {
  constructor(object, element, { home = new THREE.Vector3(0, 0, 0), stiffness = 14 } = {}) {
    this.object = object;
    this.element = element;
    this.home = home.clone();
    this.stiffness = stiffness;

    this.pos = home.clone();
    this.vel = new THREE.Vector3();
    this.angVel = new THREE.Vector3();
    this.rest = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.12, -0.5, 0.03));
    this.object.quaternion.copy(this.rest);

    this.dragging = false;
    this.idle = 0;
    this._pointer = { x: 0, y: 0 };
    this._last = { x: 0, y: 0, t: 0 };
    this.onThrow = null;

    element.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  _down = (e) => {
    this.dragging = true;
    this.idle = 0;
    this._last = { x: e.clientX, y: e.clientY, t: performance.now() };
    this.element.setPointerCapture?.(e.pointerId);
    this.element.classList.add('is-grabbing');
  };

  _move = (e) => {
    this._pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    this._pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
    if (!this.dragging) return;
    const dx = e.clientX - this._last.x;
    const dy = e.clientY - this._last.y;
    this._last = { x: e.clientX, y: e.clientY, t: performance.now() };

    this.angVel.y += dx * 0.02;
    this.angVel.x += dy * 0.02;
    this.vel.x += dx * 0.012;
    this.vel.y -= dy * 0.012;
    this.angVel.clampLength(0, 22);
  };

  _up = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.element.classList.remove('is-grabbing');
    const spin = this.angVel.length();
    if (spin > 3 && this.onThrow) this.onThrow(clamp(spin / 14, 0, 1));
  };

  /** How violently the book is currently misbehaving, 0..1. */
  get agitation() {
    return clamp(this.angVel.length() / 12 + this.vel.length() / 6, 0, 1);
  }

  update(dt) {
    const d = clamp(dt, 0, 1 / 30);

    // Magnetic return. Every decay below is expressed per *second* rather than
    // per frame, so a book on a 30fps laptop settles exactly like one on a
    // 144Hz monitor instead of ringing forever.
    const pull = this.home.clone().sub(this.pos).multiplyScalar(this.stiffness * d);
    this.vel.add(pull).multiplyScalar(Math.exp(-3.7 * d));
    this.pos.add(this.vel.clone().multiplyScalar(d));

    // integrate angular velocity as a quaternion so tumbles stay gimbal-free
    if (this.angVel.lengthSq() > 1e-6) {
      const axis = this.angVel.clone().normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, this.angVel.length() * d);
      this.object.quaternion.premultiply(q);
    }
    this.angVel.multiplyScalar(Math.exp((this.dragging ? -30 : -2.1) * d));

    // once it has calmed down, it settles back to a display pose
    if (!this.dragging && this.angVel.length() < 0.5) {
      this.object.quaternion.slerp(this.rest, 1 - Math.pow(0.4, d));
      this.idle += d;
      // a slow breathing drift so it never looks frozen
      this.angVel.y += Math.sin(this.idle * 0.4) * 0.1 * d;
    }

    this.object.position.copy(this.pos);
    this.object.position.y += Math.sin(this.idle * 0.9) * 0.02;

    // parallax lean toward the cursor while at rest
    if (!this.dragging) {
      this.object.position.x += this._pointer.x * 0.05;
      this.object.position.y += this._pointer.y * 0.03;
    }
  }

  dispose() {
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }
}
