import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GenjutsuShader } from './genjutsu.js';
import { hexInt, P } from '../core/palette.js';
import { env, tier } from '../util/env.js';

/**
 * A small WebGL stage: renderer, camera, warm library lighting, and the
 * Genjutsu post pass. Rendering is paused whenever the canvas is off screen,
 * so three stages can coexist on one page without melting a laptop.
 */
export function createStage(canvas, { alpha = true, fov = 32, post = true } = {}) {
  // WebGL is not a given: privacy browsers block it, old machines lack it, and
  // a driver can simply refuse. Returning null lets the caller show the book
  // another way instead of taking the rest of the page down with it.
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha,
      antialias: tier() > 0,
      powerPreference: 'high-performance',
    });
  } catch (error) {
    console.warn('WebGL is unavailable; falling back to a flat cover.', error);
    return null;
  }
  // Post-processing doubles the fill cost; 1.75 is the point where the extra
  // sharpness stops being worth the frames.
  renderer.setPixelRatio(Math.min(env.dpr, post ? 1.75 : 2));
  // Khronos PBR Neutral rather than ACES: ACES desaturates saturated mid-tones,
  // and it turned the rosewood leather pink.
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = false; // nothing here receives a shadow worth the pixels

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 100);
  camera.position.set(0, 0, 5);

  // ── light: a reading lamp, a cold window, and a warm bounce ──
  const key = new THREE.DirectionalLight(hexInt(P.gold), 3.4);
  key.position.set(2.6, 3.4, 3.2);
  scene.add(key);

  const rim = new THREE.DirectionalLight(hexInt(P.slate), 1.9);
  rim.position.set(-3.4, 1.2, -2.6);
  scene.add(rim);

  const hemi = new THREE.HemisphereLight(hexInt(P.cream), hexInt(P.night), 1.25);
  scene.add(hemi);

  // subtle environment reflections so the foil reads as metal
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.9;

  let composer = null;
  let genjutsu = null;
  if (post && tier() > 0) {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    renderPass.clearAlpha = 0;
    composer.addPass(renderPass);
    genjutsu = new ShaderPass(GenjutsuShader);
    composer.addPass(genjutsu);
    // Without this the composer would hand the canvas linear-light values and
    // skip tone mapping entirely — the post-processed stages would not match
    // the ones that render straight to screen.
    composer.addPass(new OutputPass());
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    renderer.setSize(w, h, false);
    composer?.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    return { w, h };
  }
  resize();
  window.addEventListener('resize', resize);

  let visible = false;
  new IntersectionObserver(
    (entries) => (visible = entries[0].isIntersecting),
    { rootMargin: '120px' }
  ).observe(canvas);

  return {
    renderer,
    scene,
    camera,
    key,
    rim,
    resize,
    get visible() {
      return visible;
    },
    /** Effect uniforms, or null when post-processing is off. */
    fx: genjutsu?.uniforms ?? null,
    render(time = 0) {
      if (genjutsu) genjutsu.uniforms.uTime.value = time;
      if (composer) composer.render();
      else renderer.render(scene, camera);
    },
    dispose() {
      pmrem.dispose();
      composer?.dispose?.();
      renderer.dispose();
    },
  };
}
