import { useGameStore } from "../state/gameStore.js";

// Synthesized sound effects (Web Audio) so the game ships with no audio
// assets. Respects the HUD mute toggle; silently no-ops if audio is blocked.
let ctx = null;

function getContext() {
  if (ctx) return ctx;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

function tone(c, { freq, endFreq = freq, start = 0, duration = 0.15, type = "sine", volume = 0.12 }) {
  const osc = c.createOscillator();
  const gain = c.createGain();
  const t0 = c.currentTime + start;
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(Math.max(endFreq, 1), t0 + duration);
  gain.gain.setValueAtTime(volume, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

const SOUNDS = {
  claim: (c) => tone(c, { freq: 440, endFreq: 660, duration: 0.14 }),
  build: (c) => {
    tone(c, { freq: 220, endFreq: 330, duration: 0.12, type: "square", volume: 0.07 });
    tone(c, { freq: 330, endFreq: 495, start: 0.1, duration: 0.14, type: "square", volume: 0.07 });
  },
  fortify: (c) => tone(c, { freq: 180, endFreq: 120, duration: 0.2, type: "triangle", volume: 0.15 }),
  attackHit: (c) => {
    tone(c, { freq: 900, endFreq: 120, duration: 0.3, type: "sawtooth", volume: 0.1 });
    tone(c, { freq: 90, endFreq: 40, start: 0.05, duration: 0.25, type: "square", volume: 0.12 });
  },
  attackMiss: (c) => tone(c, { freq: 300, endFreq: 150, duration: 0.25, type: "triangle", volume: 0.12 }),
  chain: (c) => {
    [523, 659, 784].forEach((freq, i) => tone(c, { freq, start: i * 0.09, duration: 0.18, volume: 0.1 }));
  },
  turn: (c) => tone(c, { freq: 600, endFreq: 800, duration: 0.1, volume: 0.07 }),
  victory: (c) => {
    [523, 659, 784, 1047].forEach((freq, i) => tone(c, { freq, start: i * 0.15, duration: 0.3, volume: 0.12 }));
  },
};

export function playSfx(name) {
  if (useGameStore.getState().muted) return;
  try {
    const c = getContext();
    if (!c) return;
    if (c.state === "suspended") c.resume();
    SOUNDS[name]?.(c);
  } catch {
    // Audio is cosmetic; never let it break the game.
  }
}

// Maps a server action event to its sound effect.
export function playSfxForEvent(event, myPlayerId) {
  if (!event) return;
  if (event.chainUpdate?.dominionEvents?.length) playSfx("chain");
  switch (event.action) {
    case "claim":
      return playSfx("claim");
    case "build":
      return playSfx("build");
    case "fortify":
      return playSfx("fortify");
    case "attack":
      return playSfx(event.outcome === "SUCCESS" ? "attackHit" : "attackMiss");
    case "end_turn":
      return playSfx("turn");
    default:
  }
}
