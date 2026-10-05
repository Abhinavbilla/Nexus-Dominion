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

function logEnd(ctx, x, y, r) {
  // bark
  ctx.fillStyle = radialGradient(ctx, x - r * 0.3, y - r * 0.3, r * 0.2, r * 1.1, [[0, "#9a6a38"], [1, "#4e2c12"]]);
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.45)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  // cut face
  const face = r * 0.78;
  ctx.fillStyle = radialGradient(ctx, x - face * 0.25, y - face * 0.3, face * 0.1, face, [[0, "#f6d9a0"], [0.7, "#e2ae6c"], [1, "#c88b4c"]]);
  ctx.beginPath();
  ctx.arc(x, y, face, 0, Math.PI * 2);
  ctx.fill();
  // growth rings
  ctx.strokeStyle = "rgba(120,70,28,0.55)";
  ctx.lineWidth = 1.1;
  for (const k of [0.28, 0.52, 0.76]) {
    ctx.beginPath();
    ctx.arc(x + r * 0.02, y, face * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(100,56,22,0.7)";
  ctx.beginPath();
  ctx.arc(x, y, r * 0.07, 0, Math.PI * 2);
  ctx.fill();
}

function drawWood(ctx) {
  contactShadow(ctx, 108);
  const r = 19;
  // back-to-front pyramid of log ends
  [[64, 40], [47, 71], [81, 71], [30, 102], [64, 102], [98, 102]].forEach(([x, y]) => logEnd(ctx, x, y, r));
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
