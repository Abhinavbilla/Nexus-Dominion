import { useGameStore } from "../state/gameStore.js";

// Synthesized sound design (Web Audio, no asset files). Each sound is a function
// (ctx, out, t0) that schedules notes onto `out`, so the same code plays live and
// renders offline (renderSfxOffline) for level/clipping checks and WAV previews.
//
// Every voice goes through one shared bus: dry path + a short filtered echo
// ("room" shimmer) -> compressor -> master. Notes use a fast attack, exponential
// decay and optional detuned doubling, which is what makes them sound soft and
// polished instead of raw beeps. Pitch material is consonant (major/pentatonic) for
// positive events and minor/descending for negative ones.

const MASTER_VOLUME = 0.7;

// ---------------------------------------------------------------- helpers
const noiseBuffers = new WeakMap();
function noiseBuffer(ctx) {
  if (!noiseBuffers.has(ctx)) {
    const length = Math.floor(ctx.sampleRate * 1.5);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1;
    for (let i = 0; i < length; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0; // deterministic noise so offline renders are repeatable
      data[i] = (seed / 0xffffffff) * 2 - 1;
    }
    noiseBuffers.set(ctx, buffer);
  }
  return noiseBuffers.get(ctx);
}

// One pitched voice: oscillator (+ optional detuned double) -> envelope -> optional lowpass.
function note(ctx, out, t, freq, dur, { type = "sine", gain = 0.15, attack = 0.006, bend = 1, chorus = 0, lowpass = 0 } = {}) {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  let tail = env;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    env.connect(filter);
    tail = filter;
  }
  tail.connect(out);

  const detunes = chorus ? [-chorus, chorus] : [0];
  for (const cents of detunes) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.detune.value = cents;
    osc.frequency.setValueAtTime(freq, t);
    if (bend !== 1) osc.frequency.exponentialRampToValueAtTime(Math.max(freq * bend, 20), t + dur);
    osc.connect(env);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }
}

// Filtered noise burst: impacts, air, sparkle.
function noise(ctx, out, t, dur, { type = "bandpass", freq = 1000, freqEnd = null, q = 0.8, gain = 0.1, attack = 0.002 } = {}) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(ctx);
  const filter = ctx.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t);
  if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, t);
  env.gain.linearRampToValueAtTime(gain, t + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(env).connect(out);
  src.start(t, 0.1);
  src.stop(t + dur + 0.05);
}

// Struck-metal ring: inharmonic partials with individual decays.
function ring(ctx, out, t, base, dur, gain) {
  const ratios = [1, 2.76, 5.4, 8.93];
  ratios.forEach((ratio, i) => note(ctx, out, t, base * ratio, dur / (1 + i * 0.6), { gain: gain / (1 + i * 0.7), attack: 0.001 }));
}

// ----------------------------------------------------------------- sounds
const C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392, A4 = 440;
const C5 = 523.25, E5 = 659.25, G5 = 783.99, B5 = 987.77, C6 = 1046.5, E6 = 1318.5;

export const SOUNDS = {
  // Soft rising two-note blip: you took a hex.
  claim(ctx, out, t) {
    note(ctx, out, t, E5, 0.2, { type: "triangle", gain: 0.19, chorus: 6 });
    note(ctx, out, t + 0.07, B5, 0.3, { gain: 0.17, chorus: 5 });
    note(ctx, out, t + 0.07, B5 * 2, 0.35, { gain: 0.035 });
  },

  // Clicky construction arpeggio resolving into a bright chord.
  build(ctx, out, t) {
    noise(ctx, out, t, 0.05, { freq: 2600, q: 1.2, gain: 0.1 });
    note(ctx, out, t, 130, 0.14, { gain: 0.22, bend: 0.7 });
    [C4, E4, G4].forEach((f, i) => note(ctx, out, t + 0.05 + i * 0.07, f, 0.2, { type: "square", gain: 0.055, lowpass: 1800 }));
    [C5, G5, E6].forEach((f, i) => note(ctx, out, t + 0.28, f, 0.55 - i * 0.08, { gain: 0.08 - i * 0.015, chorus: 4 }));
  },

  // Deep shield swell with a metallic ring on top.
  fortify(ctx, out, t) {
    note(ctx, out, t, 98, 0.6, { gain: 0.26, attack: 0.09, bend: 1.5 });
    note(ctx, out, t, 196, 0.5, { type: "triangle", gain: 0.08, attack: 0.1, lowpass: 900 });
    noise(ctx, out, t, 0.45, { type: "lowpass", freq: 300, freqEnd: 1400, q: 0.5, gain: 0.09, attack: 0.12 });
    ring(ctx, out, t + 0.14, 440, 0.7, 0.07);
  },

  // Laser zap + sub boom + crack: a successful hit.
  attackHit(ctx, out, t) {
    note(ctx, out, t, 1700, 0.28, { type: "sawtooth", gain: 0.1, bend: 0.07, lowpass: 3200 });
    note(ctx, out, t + 0.04, 110, 0.55, { gain: 0.34, bend: 0.3 });
    noise(ctx, out, t + 0.03, 0.12, { freq: 1900, q: 0.7, gain: 0.2 });
    noise(ctx, out, t + 0.05, 0.5, { type: "lowpass", freq: 500, freqEnd: 120, gain: 0.13 });
  },

  // Deflected shot: shield clang and a dull thud.
  attackMiss(ctx, out, t) {
    ring(ctx, out, t, 520, 0.5, 0.27);
    note(ctx, out, t, 80, 0.2, { gain: 0.36, bend: 0.6 });
    noise(ctx, out, t, 0.06, { type: "highpass", freq: 4000, gain: 0.09 });
  },

  // Supply Chain completed: sparkling rising arpeggio into a held chord. The reward cue.
  chain(ctx, out, t) {
    [C5, E5, G5, C6, E6].forEach((f, i) => {
      note(ctx, out, t + i * 0.075, f, 0.38, { type: "triangle", gain: 0.12, chorus: 5 });
      note(ctx, out, t + i * 0.075, f * 2, 0.3, { gain: 0.03 });
    });
    [C5, G5, C6].forEach((f) => note(ctx, out, t + 0.42, f, 1.0, { gain: 0.07, attack: 0.02, chorus: 4 }));
    noise(ctx, out, t + 0.1, 0.6, { type: "highpass", freq: 6500, gain: 0.025, attack: 0.15 });
  },

  // Gentle two-note chime: it is your turn.
  yourTurn(ctx, out, t) {
    note(ctx, out, t, A4, 0.32, { gain: 0.11, chorus: 4 });
    note(ctx, out, t + 0.1, E5, 0.45, { gain: 0.1, chorus: 4 });
  },

  // Fanfare: rising major arpeggio into a long glowing chord.
  victory(ctx, out, t) {
    [C4, E4, G4, C5, E5, G5].forEach((f, i) => note(ctx, out, t + i * 0.11, f, 0.5, { type: "triangle", gain: 0.13, chorus: 6 }));
    [C4, E4, G4, C5, E5].forEach((f) => note(ctx, out, t + 0.72, f, 2.0, { type: "sawtooth", gain: 0.035, attack: 0.04, lowpass: 1600 }));
    [C5, G5, C6].forEach((f) => note(ctx, out, t + 0.72, f, 1.8, { gain: 0.07, attack: 0.03, chorus: 5 }));
    noise(ctx, out, t + 0.6, 0.9, { type: "highpass", freq: 7000, gain: 0.03, attack: 0.2 });
  },

  // Descending minor phrase onto a low pad.
  defeat(ctx, out, t) {
    [A4, 349.23, D4, 220].forEach((f, i) => note(ctx, out, t + i * 0.28, f, 0.65, { type: "triangle", gain: 0.14, lowpass: 1300, chorus: 5 }));
    note(ctx, out, t + 1.1, 110, 1.4, { gain: 0.14, attack: 0.05 });
    note(ctx, out, t + 1.1, 164.8, 1.4, { gain: 0.07, attack: 0.05 });
  },

  // Neutral resolved pair.
  draw(ctx, out, t) {
    note(ctx, out, t, D4, 0.5, { gain: 0.13, chorus: 4 });
    note(ctx, out, t + 0.22, A4, 0.9, { gain: 0.12, chorus: 4 });
  },
};

// -------------------------------------------------------------- shared bus
// dry + filtered echo -> compressor (keeps layered voices from clipping) -> master.
export function createBus(ctx) {
  const input = ctx.createGain();
  const compressor = ctx.createDynamicsCompressor();
  compressor.threshold.value = -16;
  compressor.knee.value = 12;
  compressor.ratio.value = 5;
  compressor.attack.value = 0.003;
  compressor.release.value = 0.2;
  const master = ctx.createGain();
  master.gain.value = MASTER_VOLUME;

  const echo = ctx.createDelay(0.5);
  echo.delayTime.value = 0.13;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.28;
  const tone = ctx.createBiquadFilter();
  tone.type = "lowpass";
  tone.frequency.value = 3200;
  const wet = ctx.createGain();
  wet.gain.value = 0.22;

  input.connect(compressor);
  input.connect(echo);
  echo.connect(tone);
  tone.connect(feedback);
  feedback.connect(echo);
  tone.connect(wet);
  wet.connect(compressor);
  compressor.connect(master);
  master.connect(ctx.destination);
  input.master = master; // exposed so the live volume can be adjusted
  return input;
}

// ------------------------------------------------------------------ playback
let ctx = null;
let bus = null;

function getBus() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    bus = createBus(ctx);
  }
  return bus;
}

export function playSfx(name) {
  if (useGameStore.getState().muted) return;
  if (import.meta.env?.DEV) (window.__sfxLog ??= []).push(name);
  try {
    const out = getBus();
    if (!out || !SOUNDS[name]) return;
    out.master.gain.setValueAtTime(MASTER_VOLUME * useGameStore.getState().volume, ctx.currentTime);
    if (ctx.state === "suspended") ctx.resume();
    SOUNDS[name](ctx, out, ctx.currentTime + 0.02);
  } catch {
    // Audio is cosmetic; never let it break the game.
  }
}

// Maps a server action event to its sound effect.
export function playSfxForEvent(event) {
  if (!event) return;
  if (event.chainUpdate?.dominionEvents?.length) setTimeout(() => playSfx("chain"), 250);
  switch (event.action) {
    case "claim":
      return playSfx("claim");
    case "build":
      return playSfx("build");
    case "fortify":
      return playSfx("fortify");
    case "attack":
      return playSfx(event.outcome === "SUCCESS" ? "attackHit" : "attackMiss");
    default:
  }
}

// Match result cue for this player, played slightly late so it does not collide with the final action sound.
export function playResultSfx(gameState, myPlayerId) {
  const name = !gameState.winnerId ? "draw" : gameState.winnerId === myPlayerId ? "victory" : "defeat";
  setTimeout(() => playSfx(name), 450);
}

export function playYourTurnSfx() {
  setTimeout(() => playSfx("yourTurn"), 500);
}

// Offline render of one sound for analysis/previews (dev tooling; never used in play).
export async function renderSfxOffline(name, seconds = 3.5, sampleRate = 44100) {
  const offline = new OfflineAudioContext(1, Math.floor(seconds * sampleRate), sampleRate);
  SOUNDS[name](offline, createBus(offline), 0);
  const buffer = await offline.startRendering();
  return Array.from(buffer.getChannelData(0));
}
