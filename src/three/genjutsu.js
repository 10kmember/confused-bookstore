import * as THREE from 'three';
import { hexInt, P } from '../core/palette.js';

/**
 * The illusion pass. One fullscreen shader carries three of the brief's
 * effects at once: chromatic aberration on fast scroll, a pixel-sorting row
 * displacement for section glitches, and a Dark Blue keyhole vignette.
 */
export const GenjutsuShader = {
  name: 'GenjutsuShader',
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uAberration: { value: 0 },
    uGlitch: { value: 0 },
    uVignette: { value: 0.4 },
    uGrain: { value: 0.05 },
    uVoid: { value: new THREE.Color(hexInt(P.night)) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uAberration;
    uniform float uGlitch;
    uniform float uVignette;
    uniform float uGrain;
    uniform vec3 uVoid;
    varying vec2 vUv;

    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      vec2 centered = uv - 0.5;

      // ── pixel sorting: quantised rows slide sideways ──
      if (uGlitch > 0.001) {
        float rows = 90.0;
        float row = floor(uv.y * rows);
        float seed = hash(vec2(row, floor(uTime * 12.0)));
        float band = step(0.72 - uGlitch * 0.5, seed);
        uv.x += band * (seed - 0.5) * 0.22 * uGlitch;
        uv.x = clamp(uv.x, 0.0, 1.0);
      }

      // ── chromatic aberration, strongest at the edges ──
      float amount = uAberration * (0.002 + dot(centered, centered) * 0.02) + uGlitch * 0.004;
      vec2 dir = normalize(centered + 0.0001);
      vec4 src = texture2D(tDiffuse, uv);
      vec4 shiftR = texture2D(tDiffuse, uv + dir * amount);
      vec4 shiftB = texture2D(tDiffuse, uv - dir * amount);

      vec4 color;
      color.r = shiftR.r;
      color.g = src.g;
      color.b = shiftB.b;
      // These canvases sit over the page, so alpha has to survive the pass —
      // the widest of the three samples keeps the fringe from being clipped.
      color.a = max(src.a, max(shiftR.a, shiftB.a));

      // ── keyhole vignette toward the void ──
      float d = length(centered) * 1.42;
      float v = smoothstep(0.45, 1.05, d) * uVignette;
      color.rgb = mix(color.rgb, uVoid, v * color.a);

      // ── film grain, so the paper never looks digital ──
      float g = hash(uv * vec2(1024.0, 720.0) + fract(uTime)) - 0.5;
      color.rgb += g * uGrain * color.a;

      gl_FragColor = color;
    }
  `,
};
