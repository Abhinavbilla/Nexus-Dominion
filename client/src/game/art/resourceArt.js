import { makeCanvas, ellipse, polygon, linearGradient, radialGradient } from "./artUtils.js";

// Painted resource tokens (128px): stacked log ends = Wood, steel ingots = Metal, charged cell = Energy.
// Drawn with real shading so they stay legible and distinct at 16-30px, unlike flat glyphs.

export const RESOURCE_KINDS = ["wood", "metal", "energy"];
const SIZE = 128;

function contactShadow(ctx, y = 112) {
  ctx.fillStyle = radialGradient(ctx, 64, y, 0, 52, [[0, "rgba(0,0,0,0.45)"], [1, "rgba(0,0,0,0)"]]);
  ctx.save();
  ctx.translate(64, y);
  ctx.scale(1, 0.22);
  ctx.translate(-64, -y);
  ctx.beginPath();
  ctx.arc(64, y, 52, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// One horizontal log in 3/4 view: shaded bark cylinder, rounded far end, ringed cut face near end.
function log3d(ctx, x0, x1, cy, r) {
  const rx = r * 0.42;
  // far (left) end cap, rounded bark
  ctx.fillStyle = linearGradient(ctx, x0, cy - r, x0, cy + r, [[0, "#7a4a22"], [0.5, "#5a3317"], [1, "#2f1a0a"]]);
  ctx.beginPath();
  ctx.ellipse(x0, cy, rx, r, 0, 0, Math.PI * 2);
  ctx.fill();
  // cylinder body
  ctx.fillStyle = linearGradient(ctx, 0, cy - r, 0, cy + r, [[0, "#7c4b24"], [0.28, "#c68c54"], [0.55, "#8c5a2c"], [0.85, "#52301a"], [1, "#2e1a0c"]]);
  ctx.fillRect(x0, cy - r, x1 - x0, r * 2);
  // bark grooves running along the log
  ctx.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    const gy = cy - r + (i + 0.6) * ((r * 2) / 6.4);
    ctx.strokeStyle = i % 2 ? "rgba(40,20,8,0.5)" : "rgba(255,220,160,0.18)";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x0 + 2, gy);
    for (let x = x0 + 8; x < x1; x += 9) ctx.lineTo(x, gy + (((x * 7) % 3) - 1) * 0.8);
    ctx.stroke();
  }
  // near (right) end: dark bark rim, then the cut face
  ctx.fillStyle = "#3b2210";
  ctx.beginPath();
  ctx.ellipse(x1, cy, rx, r, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = radialGradient(ctx, x1 - rx * 0.2, cy - r * 0.25, 1, r * 0.9, [[0, "#fbe3b0"], [0.65, "#e5b26e"], [1, "#c58a4a"]]);
  ctx.beginPath();
  ctx.ellipse(x1, cy, rx * 0.8, r * 0.82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(120,70,28,0.6)";
  ctx.lineWidth = 1;
  for (const k of [0.3, 0.55, 0.78]) {
    ctx.beginPath();
    ctx.ellipse(x1, cy, rx * 0.8 * k, r * 0.82 * k, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(100,56,22,0.8)";
  ctx.beginPath();
  ctx.arc(x1, cy, 1.6, 0, Math.PI * 2);
  ctx.fill();
}

function drawWood(ctx) {
  contactShadow(ctx, 112);
  // back log, top log, then the front log (painter's order)
  log3d(ctx, 8, 76, 86, 18);
  log3d(ctx, 24, 92, 52, 18);
  log3d(ctx, 34, 102, 104, 18);
}

function ingot(ctx, cx, base, w, h, d) {
  const l = cx - w / 2;
  const r = cx + w / 2;
  const inset = h * 0.35;
  // front face (trapezoid)
  polygon(ctx, [[l, base], [r, base], [r - inset, base - h], [l + inset, base - h]]);
  ctx.fillStyle = linearGradient(ctx, l, base - h, r, base, [[0, "#b6c8de"], [0.5, "#7d93b0"], [1, "#4f6380"]]);
  ctx.fill();
  // right face
  polygon(ctx, [[r, base], [r + d, base - d * 0.55], [r - inset + d, base - h - d * 0.55], [r - inset, base - h]]);
  ctx.fillStyle = "#3f526d";
  ctx.fill();
  // top face
  polygon(ctx, [[l + inset, base - h], [r - inset, base - h], [r - inset + d, base - h - d * 0.55], [l + inset + d, base - h - d * 0.55]]);
  ctx.fillStyle = linearGradient(ctx, l, base - h, r, base - h - d, [[0, "#f1f7ff"], [1, "#bccde2"]]);
  ctx.fill();
  ctx.strokeStyle = "rgba(10,20,40,0.55)";
  ctx.lineWidth = 1.3;
  polygon(ctx, [[l, base], [r, base], [r - inset, base - h], [l + inset, base - h]]);
  ctx.stroke();
  // specular streak
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(l + inset + 4, base - h + 4);
  ctx.lineTo(l + inset + w * 0.45, base - h + 4);
  ctx.stroke();
}

function drawMetal(ctx) {
  contactShadow(ctx, 112);
  ingot(ctx, 36, 106, 54, 26, 14);
  ingot(ctx, 82, 106, 54, 26, 14);
  ingot(ctx, 58, 78, 54, 26, 14);
}

function drawEnergy(ctx) {
  contactShadow(ctx, 112);
  ctx.save();
  ctx.shadowColor = "rgba(255,210,60,0.9)";
  ctx.shadowBlur = 22;
  ctx.fillStyle = radialGradient(ctx, 56, 52, 4, 58, [[0, "#3a3010"], [1, "#12100a"]]);
  ctx.beginPath();
  ctx.arc(64, 62, 50, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.lineWidth = 6;
  ctx.strokeStyle = linearGradient(ctx, 20, 20, 108, 108, [[0, "#fff1a0"], [0.5, "#ffc93a"], [1, "#d98a10"]]);
  ctx.beginPath();
  ctx.arc(64, 62, 48, 0, Math.PI * 2);
  ctx.stroke();
  // bolt
  ctx.save();
  ctx.shadowColor = "#ffd23a";
  ctx.shadowBlur = 14;
  polygon(ctx, [[72, 22], [40, 70], [60, 70], [52, 104], [90, 54], [68, 54]]);
  ctx.fillStyle = linearGradient(ctx, 50, 22, 90, 104, [[0, "#fffbd0"], [0.45, "#ffd83a"], [1, "#ff9a1a"]]);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(255,255,255,0.8)";
  ctx.lineWidth = 1.6;
  polygon(ctx, [[72, 22], [40, 70], [60, 70], [52, 104], [90, 54], [68, 54]]);
  ctx.stroke();
}

const DRAW = { wood: drawWood, metal: drawMetal, energy: drawEnergy };
const cache = new Map();

export function resourceIconUrl(kind) {
  if (!cache.has(kind)) {
    const canvas = makeCanvas(SIZE, SIZE);
    DRAW[kind](canvas.getContext("2d"));
    cache.set(kind, canvas.toDataURL("image/png"));
  }
  return cache.get(kind);
}

export const isResourceIcon = (name) => RESOURCE_KINDS.includes(name);
