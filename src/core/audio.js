import { clamp, rand } from '../util/math.js';

/**
 * The library at midnight, synthesised.
 *
 * No audio files ship with this site — every sound is generated with the Web
 * Audio API: a two-oscillator drone, a band-passed noise "wind", paper rustle
 * from filtered noise bursts, felt thuds for collisions, and an additive bell
 * for the call to action. Nothing starts until the visitor asks for it.
 */
class Ambience {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.ready = false;
    this._lastRustle = 0;
    this._lastThud = 0;
    this._pianoTimer = null;
  }

  _build() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = (this.ctx = new Ctx());

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // ── shared noise source (4s of brown-ish noise, looped) ──
    const len = ctx.sampleRate * 4;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.2;
    }
    this.noiseBuffer = buf;

    // ── drone: two detuned oscillators under a slow filter sweep ──
    this.droneGain = ctx.createGain();
    this.droneGain.gain.value = 0.16;
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.value = 320;
    droneFilter.Q.value = 3;
    this.droneGain.connect(droneFilter).connect(this.master);

    [55, 82.4, 110.3].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = i === 2 ? 'triangle' : 'sine';
      osc.frequency.value = freq;
      osc.detune.value = i * 4 - 4;
      const g = ctx.createGain();
      g.gain.value = [0.5, 0.28, 0.12][i];
      osc.connect(g).connect(this.droneGain);
      osc.start();
    });

    // slow breathing on the drone filter
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.045;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 150;
    lfo.connect(lfoGain).connect(droneFilter.frequency);
    lfo.start();

    // ── wind: band-passed noise, very quiet ──
    const wind = ctx.createBufferSource();
    wind.buffer = buf;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.value = 480;
    windFilter.Q.value = 0.8;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    wind.connect(windFilter).connect(windGain).connect(this.master);
    wind.start();

    const windLfo = ctx.createOscillator();
    windLfo.frequency.value = 0.07;
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.value = 260;
    windLfo.connect(windLfoGain).connect(windFilter.frequency);
    windLfo.start();

    this.ready = true;
  }

  _now() {
    return this.ctx.currentTime;
  }

  _noise(duration, { type = 'highpass', freq = 2000, q = 0.8, gain = 0.2, attack = 0.004 } = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    src.playbackRate.value = rand(0.85, 1.3);
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const g = ctx.createGain();
    const t = this._now();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + duration + 0.05);
  }

  _tone(freq, duration, { type = 'sine', gain = 0.2, glideTo = null, attack = 0.005 } = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = type;
    const g = ctx.createGain();
    const t = this._now();
    osc.frequency.setValueAtTime(freq, t);
    if (glideTo) osc.frequency.exponentialRampToValueAtTime(glideTo, t + duration);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  /** A single piano-ish note, struck rarely, from somewhere down the stacks. */
  _piano() {
    if (!this.enabled) return;
    const root = [220, 261.6, 293.7, 329.6, 392][Math.floor(rand(0, 5))];
    [1, 2.01, 3.02].forEach((mult, i) => {
      this._tone(root * mult, 3.2 + i, { type: 'sine', gain: 0.06 / (i + 1), attack: 0.01 });
    });
    this._pianoTimer = setTimeout(() => this._piano(), rand(14000, 32000));
  }

  /** Called from a user gesture. */
  async toggle() {
    this._build();
    if (!this.ctx) return false;
    if (this.ctx.state === 'suspended') await this.ctx.resume();

    this.enabled = !this.enabled;
    const t = this._now();
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setValueAtTime(Math.max(this.master.gain.value, 0.0001), t);
    this.master.gain.linearRampToValueAtTime(this.enabled ? 0.55 : 0, t + (this.enabled ? 2.5 : 0.6));

    clearTimeout(this._pianoTimer);
    if (this.enabled) this._pianoTimer = setTimeout(() => this._piano(), rand(6000, 12000));

    return this.enabled;
  }

  /** Paper rustle, intensity 0..1, rate-limited so scrolling doesn't machine-gun. */
  rustle(intensity = 0.5) {
    if (!this.enabled || !this.ready) return;
    const now = performance.now();
    if (now - this._lastRustle < 150) return;
    this._lastRustle = now;
    const i = clamp(intensity, 0, 1);
    this._noise(rand(0.12, 0.26), {
      type: 'highpass',
      freq: rand(1800, 3600),
      gain: 0.02 + i * 0.05,
    });
  }

  /** Soft thud for a physics collision. */
  thud(strength = 0.5) {
    if (!this.enabled || !this.ready) return;
    const now = performance.now();
    if (now - this._lastThud < 45) return;
    this._lastThud = now;
    const s = clamp(strength, 0.05, 1);
    this._tone(rand(110, 170), 0.18, { type: 'sine', glideTo: 48, gain: 0.05 + s * 0.16 });
    this._noise(0.07, { type: 'lowpass', freq: 900, gain: 0.03 + s * 0.06 });
  }

  /** Bell chime — additive partials, for CTA hover and released whispers. */
  chime() {
    if (!this.enabled || !this.ready) return;
    const root = rand(620, 720);
    [1, 2.76, 5.4].forEach((m, i) => {
      this._tone(root * m, 1.6 - i * 0.35, { type: 'sine', gain: 0.1 / (i + 1.4) });
    });
  }

  blast() {
    if (!this.enabled || !this.ready) return;
    this._noise(0.34, { type: 'bandpass', freq: rand(320, 700), q: 1.4, gain: 0.16 });
    this._tone(rand(70, 95), 0.4, { type: 'triangle', glideTo: 38, gain: 0.14 });
  }
}

export const audio = new Ambience();
