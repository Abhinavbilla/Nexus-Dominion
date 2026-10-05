import {
  makeCanvas, mulberry32, ellipse, polygon, linearGradient, radialGradient, rgba, mix, lighten, darken, rand,
} from "./artUtils.js";
import { TEX_SCALE } from "./tileArt.js";

// 2.5D building sprites (spec.md §68). Each is drawn from simple solids — boxes and
// cylinders with a lit left face, a shaded right face and a top — then dressed with
// windows, trim and glow in the OWNER'S color so ownership reads without a tint.

export function buildingMetrics(hexSize) {
  const S = hexSize * TEX_SCALE;
  const W = Math.ceil(S * 1.7);
  const H = Math.ceil(S * 2.0);
  return { S, W, H, cx: W / 2, groundY: H * 0.8 };
}

export function buildingKey(type, colorName) {
  return `bld-${type}-${colorName}`;
}

// Chimney tops (relative to the sprite's ground point, in units of S) for the factory smoke emitters.
export const FACTORY_SMOKE = [
  { x: -0.2, y: -0.98 },
  { x: 0.08, y: -1.06 },
];

// ------------------------------------------------------------------- solids
function groundShadow(ctx, x, y, rx, ry, alpha = 0.4) {
  ctx.save();
  ctx.fillStyle = radialGradient(ctx, x, y, 0, rx, [[0, `rgba(0,0,0,${alpha})`], [1, "rgba(0,0,0,0)"]]);
  ctx.translate(x, y);
  ctx.scale(1, ry / rx);
  ctx.translate(-x, -y);
  ctx.beginPath();
  ctx.arc(x, y, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Box standing on (x, y): front face, right side face, top face.
function box(ctx, x, y, w, h, d, c) {
  const dx = d;
  const dy = -d * 0.5;
  polygon(ctx, [[x - w / 2, y], [x + w / 2, y], [x + w / 2, y - h], [x - w / 2, y - h]]);
  ctx.fillStyle = linearGradient(ctx, x - w / 2, y - h, x + w / 2, y, [[0, c.front0 || lighten(c.front, 0.12)], [1, c.front]]);
  ctx.fill();
  polygon(ctx, [[x + w / 2, y], [x + w / 2 + dx, y + dy], [x + w / 2 + dx, y + dy - h], [x + w / 2, y - h]]);
  ctx.fillStyle = c.side;
  ctx.fill();
  polygon(ctx, [[x - w / 2, y - h], [x + w / 2, y - h], [x + w / 2 + dx, y + dy - h], [x - w / 2 + dx, y + dy - h]]);
  ctx.fillStyle = c.top;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.35)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function cylinder(ctx, x, y, rx, ry, h, c) {
  ctx.fillStyle = linearGradient(ctx, x - rx, y, x + rx, y, [[0, c.left], [0.45, c.mid], [1, c.right]]);
  ctx.beginPath();
  ctx.moveTo(x - rx, y);
  ctx.lineTo(x - rx, y - h);
  ctx.ellipse(x, y - h, rx, ry, 0, Math.PI, 0, true);
  ctx.lineTo(x + rx, y);
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI, false);
  ctx.closePath();
  ctx.fill();
  ellipse(ctx, x, y - h, rx, ry);
  ctx.fillStyle = c.top;
  ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,0.3)";
  ctx.lineWidth = 1;
  ctx.stroke();
}

function glow(ctx, color, blur, fn) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  fn();
  ctx.restore();
}

// ------------------------------------------------------------------- buildings
function drawHub(ctx, m, color) {
  const { S, cx, groundY: gy } = m;
  groundShadow(ctx, cx, gy + S * 0.04, S * 0.8, S * 0.28);
  const steel = { left: "#566078", mid: "#8d98b3", right: "#3b4358", top: "#a9b4cf" };
  cylinder(ctx, cx, gy, S * 0.62, S * 0.25, S * 0.13, { ...steel, top: "#7a86a3" });
  // owner-colored deck ring
  glow(ctx, color, S * 0.12, () => {
    ctx.strokeStyle = rgba(color, 0.95);
    ctx.lineWidth = S * 0.028;
    ellipse(ctx, cx, gy - S * 0.13, S * 0.6, S * 0.24);
    ctx.stroke();
  });
  cylinder(ctx, cx, gy - S * 0.13, S * 0.4, S * 0.16, S * 0.42, steel);
  // glowing band
  ctx.fillStyle = rgba(color, 0.9);
  ctx.beginPath();
  ctx.ellipse(cx, gy - S * 0.36, S * 0.4, S * 0.16, 0, 0, Math.PI);
  ctx.lineTo(cx - S * 0.4, gy - S * 0.42);
  ctx.ellipse(cx, gy - S * 0.42, S * 0.4, S * 0.16, 0, Math.PI, 0, true);
  ctx.closePath();
  ctx.globalAlpha = 0.85;
  ctx.fill();
  ctx.globalAlpha = 1;
  cylinder(ctx, cx, gy - S * 0.55, S * 0.26, S * 0.105, S * 0.2, { ...steel, top: "#c6d0e8" });
  // antenna + beacon
  ctx.strokeStyle = "#cfd8ee";
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.moveTo(cx, gy - S * 0.75);
  ctx.lineTo(cx, gy - S * 1.1);
  ctx.stroke();
  glow(ctx, color, S * 0.25, () => {
    ctx.fillStyle = radialGradient(ctx, cx, gy - S * 1.14, 0, S * 0.1, [[0, "#ffffff"], [0.5, color], [1, rgba(color, 0)]]);
    ctx.beginPath();
    ctx.arc(cx, gy - S * 1.14, S * 0.1, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawFactory(ctx, m, color) {
  const { S, cx, groundY: gy } = m;
  groundShadow(ctx, cx + S * 0.1, gy + S * 0.04, S * 0.8, S * 0.26);
  const brick = { front: "#8a5f4b", front0: "#a37560", side: "#5e3e30", top: "#a58572" };
  box(ctx, cx - S * 0.08, gy, S * 0.95, S * 0.46, S * 0.34, brick);

  // sawtooth roof
  for (let i = 0; i < 3; i++) {
    const x0 = cx - S * 0.08 - S * 0.475 + i * (S * 0.95 / 3);
    const w = (S * 0.95) / 3;
    const topY = gy - S * 0.46;
    polygon(ctx, [[x0, topY], [x0 + w, topY], [x0 + w, topY - S * 0.2]]);
    ctx.fillStyle = linearGradient(ctx, x0, topY, x0 + w, topY - S * 0.2, [[0, "#6e7782"], [1, "#a9b3be"]]);
    ctx.fill();
    ctx.fillStyle = "rgba(255,238,170,0.9)";
    ctx.fillRect(x0 + w * 0.65, topY - S * 0.17, w * 0.28, S * 0.14);
  }
  // owner trim stripe
  ctx.fillStyle = color;
  ctx.fillRect(cx - S * 0.08 - S * 0.475, gy - S * 0.1, S * 0.95, S * 0.05);
  // lit windows
  for (let i = 0; i < 4; i++) {
    glow(ctx, "#ffcf6a", S * 0.05, () => {
      ctx.fillStyle = "#ffd98a";
      ctx.fillRect(cx - S * 0.08 - S * 0.4 + i * S * 0.23, gy - S * 0.33, S * 0.12, S * 0.1);
    });
  }
  // door
  ctx.fillStyle = "#2a1a14";
  ctx.fillRect(cx - S * 0.08 - S * 0.06, gy - S * 0.16, S * 0.12, S * 0.16);

  // chimneys
  [[-0.2, 0.62], [0.08, 0.7]].forEach(([dx, h]) => {
    const x = cx + dx * S;
    box(ctx, x, gy - S * 0.46, S * 0.14, S * h * 0.55, S * 0.1, { front: "#9a9aa6", front0: "#b6b6c2", side: "#6a6a78", top: "#cfcfda" });
    ctx.fillStyle = color;
    ctx.fillRect(x - S * 0.07, gy - S * 0.46 - S * h * 0.55 + S * 0.03, S * 0.14, S * 0.04);
  });
}

function drawFortress(ctx, m, color) {
  const { S, cx, groundY: gy } = m;
  groundShadow(ctx, cx + S * 0.05, gy + S * 0.04, S * 0.85, S * 0.28);
  const stone = { front: "#7d8190", front0: "#9aa0b0", side: "#555a6a", top: "#b6bcca" };
  const tw = { left: "#6f7484", mid: "#a6acba", right: "#4a4f5f", top: "#c4cad8" };

  // back towers first, keep, then front towers
  cylinder(ctx, cx - S * 0.46, gy - S * 0.05, S * 0.16, S * 0.065, S * 0.82, tw);
  box(ctx, cx, gy, S * 0.72, S * 0.64, S * 0.3, stone);
  // masonry lines
  ctx.strokeStyle = "rgba(0,0,0,0.18)";
  ctx.lineWidth = 1;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(cx - S * 0.36, gy - i * S * 0.12);
    ctx.lineTo(cx + S * 0.36, gy - i * S * 0.12);
    ctx.stroke();
  }
  // crenellations
  for (let i = 0; i < 5; i++) {
    box(ctx, cx - S * 0.3 + i * S * 0.15, gy - S * 0.64, S * 0.09, S * 0.1, S * 0.06, stone);
  }
  // gate
  ctx.fillStyle = "#1c1f2a";
  ctx.beginPath();
  ctx.moveTo(cx - S * 0.1, gy);
  ctx.lineTo(cx - S * 0.1, gy - S * 0.2);
  ctx.arc(cx, gy - S * 0.2, S * 0.1, Math.PI, 0);
  ctx.lineTo(cx + S * 0.1, gy);
  ctx.closePath();
  ctx.fill();
  // owner banner band
  ctx.fillStyle = color;
  ctx.fillRect(cx - S * 0.36, gy - S * 0.5, S * 0.72, S * 0.045);

  [[-0.5, 0.88], [0.52, 0.72]].forEach(([dx, th], i) => {
    const x = cx + dx * S;
    const y = gy + (i ? S * 0.02 : S * 0.03);
    cylinder(ctx, x, y, S * 0.17, S * 0.07, S * th * 0.9, tw);
    // conical roof in owner color
    const top = y - S * th * 0.9;
    polygon(ctx, [[x, top - S * 0.28], [x - S * 0.2, top], [x + S * 0.2, top]]);
    ctx.fillStyle = linearGradient(ctx, x - S * 0.2, top, x + S * 0.2, top, [[0, lighten(color, 0.25)], [0.55, color], [1, darken(color, 0.45)]]);
    ctx.fill();
  });

  // flag
  const fx = cx + S * 0.05;
  const fy = gy - S * 0.74;
  ctx.strokeStyle = "#d8dce8";
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.moveTo(fx, fy);
  ctx.lineTo(fx, fy - S * 0.38);
  ctx.stroke();
  polygon(ctx, [[fx, fy - S * 0.38], [fx + S * 0.26, fy - S * 0.3], [fx, fy - S * 0.2]]);
  ctx.fillStyle = color;
  ctx.fill();
}

function drawCity(ctx, m, color, rng) {
  const { S, cx, groundY: gy } = m;
  groundShadow(ctx, cx, gy + S * 0.05, S * 0.85, S * 0.28);
  glow(ctx, color, S * 0.22, () => {
    ctx.fillStyle = rgba(color, 0.28);
    ellipse(ctx, cx, gy + S * 0.02, S * 0.7, S * 0.2);
    ctx.fill();
  });

  const glass = { front: "#3d4d6d", front0: "#5a6e96", side: "#27324c", top: "#7389b3" };
  const blocks = [
    { x: -0.5, y: 0.0, w: 0.3, h: 0.55, d: 0.16 },
    { x: 0.44, y: 0.03, w: 0.28, h: 0.62, d: 0.16 },
    { x: -0.02, y: -0.12, w: 0.34, h: 1.18, d: 0.2 },
    { x: -0.24, y: 0.1, w: 0.26, h: 0.82, d: 0.15 },
    { x: 0.22, y: 0.12, w: 0.28, h: 0.7, d: 0.15 },
  ];
  blocks.forEach((b) => {
    const x = cx + b.x * S;
    const y = gy + b.y * S;
    const w = b.w * S;
    const h = b.h * S;
    box(ctx, x, y, w, h, b.d * S, glass);
    // window grid
    const cols = 3;
    const rows = Math.floor(h / (S * 0.1));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const lit = rng() < 0.62;
        ctx.fillStyle = lit ? "rgba(255,232,160,0.95)" : "rgba(10,15,30,0.55)";
        ctx.fillRect(x - w / 2 + w * 0.12 + c * (w * 0.3), y - h + S * 0.05 + r * S * 0.1, w * 0.18, S * 0.055);
      }
    }
    // owner-colored roof light
    glow(ctx, color, S * 0.08, () => {
      ctx.fillStyle = color;
      ctx.fillRect(x - w / 2, y - h - S * 0.012, w, S * 0.035);
    });
  });
  // central spire
  const sx = cx - S * 0.02;
  const sy = gy - S * 0.12 - S * 1.18;
  ctx.strokeStyle = "#dfe6f5";
  ctx.lineWidth = S * 0.02;
  ctx.beginPath();
  ctx.moveTo(sx + S * 0.08, sy - S * 0.1);
  ctx.lineTo(sx + S * 0.08, sy - S * 0.36);
  ctx.stroke();
  glow(ctx, color, S * 0.22, () => {
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(sx + S * 0.08, sy - S * 0.38, S * 0.04, 0, Math.PI * 2);
    ctx.fill();
  });
}

const DRAWERS = { command_hub: drawHub, factory: drawFactory, fortress: drawFortress, city: drawCity };

export function renderBuilding(type, colorCss, hexSize) {
  const m = buildingMetrics(hexSize);
  const canvas = makeCanvas(m.W, m.H);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(type.length * 31 + 5);
  DRAWERS[type](ctx, m, colorCss, rng);
  return { canvas, metrics: m };
}

export function createBuildingTextures(scene, hexSize, playerColors) {
  let metrics = buildingMetrics(hexSize);
  for (const [colorName, css] of Object.entries(playerColors)) {
    for (const type of Object.keys(DRAWERS)) {
      const key = buildingKey(type, colorName);
      if (scene.textures.exists(key)) continue;
      scene.textures.addCanvas(key, renderBuilding(type, css, hexSize).canvas);
    }
  }
  return metrics;
}

// Data URL of a building sprite for React cards (Build menu).
export function buildingDataUrl(type, colorCss, hexSize = 24) {
  return renderBuilding(type, colorCss, hexSize).canvas.toDataURL("image/png");
}
