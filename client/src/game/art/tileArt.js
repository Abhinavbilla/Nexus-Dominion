import {
  makeCanvas, mulberry32, hexPath, rand, pick, pointInCircle, ellipse, polygon,
  linearGradient, radialGradient, rgba, mix, lighten, darken,
} from "./artUtils.js";

// Painted terrain tiles (spec.md §66). Each tile is an extruded hex "token":
// drop shadow, stone side wall, bevelled painted top, and terrain-specific scenery
// drawn from a seeded RNG so the 3 variants per terrain look hand-placed.

export const TEX_SCALE = 3; // texture pixels per world unit (crisp up to 2x zoom on retina)
export const TILE_VARIANTS = 3;
export const TERRAINS = ["plains", "forest", "mine", "energy_field", "city_site"];

const PALETTE = {
  plains: { top0: "#8fae63", top1: "#5d7d45", side: "#3d4d2c", rim: "#b9d28a" },
  forest: { top0: "#3f8052", top1: "#1c4a2e", side: "#17331f", rim: "#6cb07c" },
  mine: { top0: "#827e8d", top1: "#464a58", side: "#2c2f3a", rim: "#b3b0c2" },
  energy_field: { top0: "#30408f", top1: "#161a52", side: "#0f1236", rim: "#7d93ff" },
  city_site: { top0: "#d1b583", top1: "#917852", side: "#5f4d33", rim: "#efd9a6" },
};

export function tileMetrics(hexSize) {
  const S = hexSize * TEX_SCALE;
  const D = S * 0.2;
  const PAD = S * 0.22;
  const W = Math.ceil(Math.sqrt(3) * S + PAD * 2);
  const H = Math.ceil(2 * S + D + PAD * 2);
  return { S, D, PAD, W, H, cx: W / 2, cy: PAD + S };
}

export function tileKey(terrain, variant) {
  return `tile-${terrain}-${variant}`;
}

// ------------------------------------------------------------------ base tile
function drawBase(ctx, m, pal, rng) {
  const { S, D, cx, cy } = m;

  // soft contact shadow under the whole token
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = S * 0.22;
  ctx.shadowOffsetY = D + S * 0.06;
  hexPath(ctx, cx, cy, S * 0.985);
  ctx.fillStyle = pal.side;
  ctx.fill();
  ctx.restore();

  // stone side wall: stack of offset hexes, lighter near the top
  for (let k = Math.ceil(D); k >= 0; k--) {
    hexPath(ctx, cx, cy + k, S);
    ctx.fillStyle = mix(pal.side, lighten(pal.side, 0.35), 1 - k / D);
    ctx.fill();
  }
  // bottom edge shade
  hexPath(ctx, cx, cy + D, S);
  ctx.strokeStyle = "rgba(0,0,0,0.5)";
  ctx.lineWidth = S * 0.02;
  ctx.stroke();

  // painted top
  ctx.save();
  hexPath(ctx, cx, cy, S);
  ctx.clip();
  ctx.fillStyle = linearGradient(ctx, cx - S * 0.6, cy - S, cx + S * 0.6, cy + S, [[0, pal.top0], [1, pal.top1]]);
  ctx.fillRect(cx - S, cy - S, S * 2, S * 2);

  // grain: tiny light/dark specks so flat color reads as material
  for (let i = 0; i < 380; i++) {
    const p = pointInCircle(rng, S);
    ctx.fillStyle = rng() < 0.5 ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.07)";
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, rand(rng, 0.8, 2.6), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRimAndVignette(ctx, m, pal) {
  const { S, cx, cy } = m;
  ctx.save();
  hexPath(ctx, cx, cy, S);
  ctx.clip();
  ctx.fillStyle = radialGradient(ctx, cx, cy, S * 0.45, S * 1.02, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.34)"]]);
  ctx.fillRect(cx - S, cy - S, S * 2, S * 2);
  ctx.restore();

  // directional bevel: edges facing the light (up-left) glow, away edges darken
  const lightAngle = (-135 * Math.PI) / 180;
  for (let i = 0; i < 6; i++) {
    const a0 = (Math.PI / 180) * (60 * i - 30);
    const a1 = (Math.PI / 180) * (60 * (i + 1) - 30);
    const mid = (Math.PI / 180) * (60 * i + 0);
    const facing = Math.cos(mid - lightAngle);
    ctx.beginPath();
    ctx.moveTo(cx + (S - 1) * Math.cos(a0), cy + (S - 1) * Math.sin(a0));
    ctx.lineTo(cx + (S - 1) * Math.cos(a1), cy + (S - 1) * Math.sin(a1));
    ctx.lineWidth = S * 0.045;
    ctx.lineCap = "round";
    ctx.strokeStyle = facing > 0 ? rgba(pal.rim, 0.55 * facing) : `rgba(0,0,0,${0.5 * -facing})`;
    ctx.stroke();
  }
  hexPath(ctx, cx, cy, S * 0.93);
  ctx.strokeStyle = "rgba(255,255,255,0.06)";
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

// ------------------------------------------------------------------ scenery
function drawPlains(ctx, m, rng) {
  const { S, cx, cy } = m;
  for (let i = 0; i < 7; i++) {
    const p = pointInCircle(rng, S * 0.7);
    ctx.fillStyle = radialGradient(ctx, cx + p.x, cy + p.y, 0, S * rand(rng, 0.18, 0.34), [
      [0, rng() < 0.5 ? "rgba(210,235,150,0.22)" : "rgba(30,60,20,0.2)"],
      [1, "rgba(0,0,0,0)"],
    ]);
    ctx.fillRect(cx - S, cy - S, S * 2, S * 2);
  }
  ctx.lineCap = "round";
  for (let i = 0; i < 170; i++) {
    const p = pointInCircle(rng, S * 0.88);
    const h = rand(rng, S * 0.04, S * 0.1);
    ctx.strokeStyle = rng() < 0.6 ? "rgba(214,240,150,0.4)" : "rgba(40,80,30,0.45)";
    ctx.lineWidth = S * 0.012;
    ctx.beginPath();
    ctx.moveTo(cx + p.x, cy + p.y);
    ctx.quadraticCurveTo(cx + p.x + rand(rng, -3, 3), cy + p.y - h * 0.6, cx + p.x + rand(rng, -S * 0.04, S * 0.04), cy + p.y - h);
    ctx.stroke();
  }
  for (let i = 0; i < 8; i++) {
    const p = pointInCircle(rng, S * 0.72);
    ctx.fillStyle = pick(rng, ["#f7e9a6", "#ffffff", "#f2a9cd", "#ffd0a0"]);
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, S * 0.016, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,200,60,0.9)";
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, S * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPine(ctx, x, y, h, rng) {
  const w = h * 0.62;
  ctx.fillStyle = "rgba(0,0,0,0.28)";
  ellipse(ctx, x + h * 0.08, y + h * 0.03, w * 0.5, h * 0.09);
  ctx.fill();
  ctx.fillStyle = "#5a3d28";
  ctx.fillRect(x - w * 0.06, y - h * 0.18, w * 0.12, h * 0.2);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const t = i / tiers;
    const bw = w * (1 - t * 0.28);
    const by = y - h * 0.12 - t * h * 0.34;
    const th = h * 0.46;
    // lit left face, shaded right face
    polygon(ctx, [[x, by - th], [x - bw / 2, by], [x, by + h * 0.03]]);
    ctx.fillStyle = linearGradient(ctx, x - bw / 2, by, x, by - th, [[0, "#5cae6e"], [1, "#3d8a52"]]);
    ctx.fill();
    polygon(ctx, [[x, by - th], [x + bw / 2, by], [x, by + h * 0.03]]);
    ctx.fillStyle = linearGradient(ctx, x, by, x + bw / 2, by, [[0, "#2f7044"], [1, "#1b4a2c"]]);
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(210,255,215,0.28)";
  ctx.lineWidth = Math.max(1, h * 0.012);
  ctx.beginPath();
  ctx.moveTo(x, y - h * 0.98);
  ctx.lineTo(x - w * 0.4, y - h * 0.14);
  ctx.stroke();
}

function drawOak(ctx, x, y, h) {
  const r = h * 0.3;
  ctx.fillStyle = "rgba(0,0,0,0.26)";
  ellipse(ctx, x + h * 0.08, y + h * 0.03, r * 1.15, h * 0.08);
  ctx.fill();
  ctx.fillStyle = "#6a4a30";
  ctx.fillRect(x - h * 0.05, y - h * 0.34, h * 0.1, h * 0.36);
  [[-0.34, -0.5, 0.78], [0.34, -0.52, 0.74], [0, -0.78, 0.92], [0, -0.52, 1]].forEach(([dx, dy, k], i) => {
    const cx = x + dx * r * 1.1;
    const cy = y + dy * h * 0.9;
    ctx.fillStyle = radialGradient(ctx, cx - r * 0.35, cy - r * 0.4, r * 0.1, r * k, [[0, i === 3 ? "#8bd075" : "#6fbf62"], [0.6, "#3f8f4a"], [1, "#245e32"]]);
    ctx.beginPath();
    ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawBush(ctx, x, y, s) {
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ellipse(ctx, x + s * 0.2, y + s * 0.12, s * 0.9, s * 0.26);
  ctx.fill();
  [[-0.5, 0], [0.4, -0.05], [0, -0.35]].forEach(([dx, dy]) => {
    ctx.fillStyle = radialGradient(ctx, x + dx * s - s * 0.2, y + dy * s - s * 0.2, 0, s * 0.62, [[0, "#7ccf6c"], [1, "#2d7a3e"]]);
    ctx.beginPath();
    ctx.arc(x + dx * s, y + dy * s, s * 0.55, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawForest(ctx, m, rng, variant) {
  const { S, cx, cy } = m;
  ctx.fillStyle = radialGradient(ctx, cx, cy, 0, S * 0.9, [[0, "rgba(20,70,35,0.5)"], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(cx - S, cy - S, S * 2, S * 2);
  const trees = [];
  const target = 7 + variant;
  for (let attempt = 0; attempt < 140 && trees.length < target; attempt++) {
    const p = pointInCircle(rng, S * 0.62);
    if (trees.every((t) => Math.hypot(t.x - p.x, t.y - p.y) > S * 0.25)) trees.push({ ...p, h: rand(rng, S * 0.4, S * 0.58) });
  }
  const kinds = trees.map(() => (rng() < 0.38 ? "oak" : "pine"));
  trees
    .map((t, i) => ({ ...t, kind: kinds[i] }))
    .sort((a, b) => a.y - b.y)
    .forEach((t) => (t.kind === "oak" ? drawOak(ctx, cx + t.x, cy + t.y + S * 0.22, t.h * 0.9) : drawPine(ctx, cx + t.x, cy + t.y + S * 0.22, t.h, rng)));
  for (let i = 0; i < 5; i++) {
    const p = pointInCircle(rng, S * 0.72);
    drawBush(ctx, cx + p.x, cy + p.y + S * 0.3, S * rand(rng, 0.05, 0.09));
  }
}

function drawMine(ctx, m, rng) {
  const { S, cx, cy } = m;
  for (let i = 0; i < 46; i++) {
    const p = pointInCircle(rng, S * 0.85);
    ctx.fillStyle = `rgba(${rng() < 0.5 ? "30,30,40" : "190,190,205"},${rand(rng, 0.1, 0.3)})`;
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, rand(rng, 1.5, S * 0.035), 0, Math.PI * 2);
    ctx.fill();
  }
  const baseY = cy + S * 0.3;
  const peaks = [
    { x: -0.34, h: 0.55, w: 0.3 },
    { x: 0.32, h: 0.5, w: 0.28 },
    { x: -0.02, h: 0.8, w: 0.38 },
  ];
  peaks.forEach((pk) => {
    const px = cx + pk.x * S;
    const top = baseY - pk.h * S;
    const hw = pk.w * S;
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ellipse(ctx, px + hw * 0.3, baseY + S * 0.02, hw * 1.1, S * 0.07);
    ctx.fill();
    polygon(ctx, [[px, top], [px - hw, baseY], [px + hw * 0.05, baseY]]);
    ctx.fillStyle = linearGradient(ctx, px - hw, baseY, px, top, [[0, "#6f6c7c"], [1, "#b4b1c2"]]);
    ctx.fill();
    polygon(ctx, [[px, top], [px + hw, baseY], [px + hw * 0.05, baseY]]);
    ctx.fillStyle = linearGradient(ctx, px, top, px + hw, baseY, [[0, "#555362"], [1, "#2e2d3b"]]);
    ctx.fill();
    // snow-ish ridge highlight + ore veins
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = S * 0.012;
    ctx.beginPath();
    ctx.moveTo(px, top);
    ctx.lineTo(px - hw * 0.42, top + pk.h * S * 0.45);
    ctx.stroke();
    ctx.strokeStyle = "rgba(226,142,78,0.9)";
    ctx.lineWidth = S * 0.016;
    for (let v = 0; v < 3; v++) {
      const vx = px + rand(rng, -hw * 0.3, hw * 0.6);
      const vy = top + pk.h * S * rand(rng, 0.45, 0.8);
      ctx.beginPath();
      ctx.moveTo(vx, vy);
      ctx.lineTo(vx + rand(rng, 4, S * 0.1), vy + rand(rng, -S * 0.04, S * 0.05));
      ctx.stroke();
    }
  });
  // timber-framed mine entrance
  const ex = cx + S * 0.06;
  const ey = baseY - S * 0.02;
  ctx.fillStyle = "#14121a";
  ctx.beginPath();
  ctx.moveTo(ex - S * 0.1, ey);
  ctx.lineTo(ex - S * 0.1, ey - S * 0.12);
  ctx.arc(ex, ey - S * 0.12, S * 0.1, Math.PI, 0);
  ctx.lineTo(ex + S * 0.1, ey);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#8a5a36";
  ctx.lineWidth = S * 0.028;
  ctx.beginPath();
  ctx.moveTo(ex - S * 0.11, ey);
  ctx.lineTo(ex - S * 0.11, ey - S * 0.13);
  ctx.lineTo(ex + S * 0.11, ey - S * 0.13);
  ctx.lineTo(ex + S * 0.11, ey);
  ctx.stroke();
  // ore crystals
  for (let i = 0; i < 4; i++) {
    const x = cx + rand(rng, -S * 0.5, S * 0.5);
    const y = baseY + rand(rng, S * 0.02, S * 0.2);
    const h = rand(rng, S * 0.1, S * 0.17);
    ctx.save();
    ctx.shadowColor = "rgba(120,220,255,0.8)";
    ctx.shadowBlur = S * 0.07;
    polygon(ctx, [[x, y - h], [x + h * 0.4, y - h * 0.3], [x, y], [x - h * 0.4, y - h * 0.3]]);
    ctx.fillStyle = linearGradient(ctx, x - h * 0.4, y - h, x + h * 0.4, y, [[0, "#d6f6ff"], [0.5, "#58c8e8"], [1, "#2478a8"]]);
    ctx.fill();
    ctx.restore();
  }
}

function drawEnergy(ctx, m, rng) {
  const { S, cx, cy } = m;
  ctx.save();
  ctx.strokeStyle = "rgba(110,200,255,0.4)";
  ctx.lineWidth = S * 0.014;
  ctx.setLineDash([S * 0.05, S * 0.04]);
  [0.78, 0.6].forEach((r) => {
    ctx.beginPath();
    ctx.arc(cx, cy, S * r, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.setLineDash([]);
  ctx.strokeStyle = "rgba(110,200,255,0.25)";
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * S * 0.28, cy + Math.sin(a) * S * 0.28);
    ctx.lineTo(cx + Math.cos(a) * S * 0.58, cy + Math.sin(a) * S * 0.58);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = radialGradient(ctx, cx, cy + S * 0.05, 0, S * 0.62, [[0, "rgba(120,230,255,0.55)"], [0.5, "rgba(80,120,255,0.18)"], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(cx - S, cy - S, S * 2, S * 2);

  const crystals = [
    { x: -0.2, y: 0.22, h: 0.36, w: 0.13 },
    { x: 0.22, y: 0.24, h: 0.3, w: 0.12 },
    { x: 0.02, y: 0.2, h: 0.55, w: 0.18 },
  ];
  crystals.forEach((c) => {
    const x = cx + c.x * S;
    const y = cy + c.y * S;
    const h = c.h * S;
    const w = c.w * S;
    ctx.save();
    ctx.shadowColor = "#6fe0ff";
    ctx.shadowBlur = S * 0.14;
    polygon(ctx, [[x, y - h], [x - w, y - h * 0.62], [x - w, y - h * 0.1], [x, y + h * 0.04]]);
    ctx.fillStyle = linearGradient(ctx, x - w, y - h, x, y, [[0, "#c9f7ff"], [1, "#4fb8f0"]]);
    ctx.fill();
    ctx.restore();
    polygon(ctx, [[x, y - h], [x + w, y - h * 0.62], [x + w, y - h * 0.1], [x, y + h * 0.04]]);
    ctx.fillStyle = linearGradient(ctx, x, y - h, x + w, y, [[0, "#6aa8ff"], [1, "#2a3fb0"]]);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = S * 0.01;
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x, y + h * 0.04);
    ctx.stroke();
  });
  for (let i = 0; i < 16; i++) {
    const p = pointInCircle(rng, S * 0.85);
    ctx.fillStyle = `rgba(160,235,255,${rand(rng, 0.3, 0.95)})`;
    ctx.beginPath();
    ctx.arc(cx + p.x, cy + p.y, rand(rng, 1, S * 0.022), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawCitySite(ctx, m, rng) {
  const { S, cx, cy } = m;
  const cell = S * 0.23;
  ctx.lineWidth = 1.2;
  for (let gy = -5; gy <= 5; gy++) {
    for (let gx = -5; gx <= 5; gx++) {
      const x = cx + gx * cell + (gy % 2) * cell * 0.5;
      const y = cy + gy * cell * 0.8;
      ctx.fillStyle = `rgba(${rng() < 0.5 ? "255,240,200" : "70,50,25"},${rand(rng, 0.04, 0.16)})`;
      ctx.beginPath();
      ctx.roundRect(x - cell * 0.46, y - cell * 0.36, cell * 0.92, cell * 0.72, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(60,40,15,0.22)";
      ctx.stroke();
    }
  }
  // foundation outline + gold survey markers
  ctx.save();
  ctx.setLineDash([S * 0.07, S * 0.05]);
  hexPath(ctx, cx, cy, S * 0.64);
  ctx.strokeStyle = "rgba(255,214,120,0.85)";
  ctx.lineWidth = S * 0.018;
  ctx.stroke();
  ctx.restore();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    ctx.fillStyle = "#ffd47a";
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * S * 0.64, cy + Math.sin(a) * S * 0.64, S * 0.025, 0, Math.PI * 2);
    ctx.fill();
  }
  // broken columns
  [[-0.5, 0.42], [0.52, 0.34]].forEach(([dx, dy]) => {
    const x = cx + dx * S;
    const y = cy + dy * S;
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ellipse(ctx, x + S * 0.04, y + S * 0.01, S * 0.09, S * 0.03);
    ctx.fill();
    ctx.fillStyle = linearGradient(ctx, x - S * 0.05, y, x + S * 0.05, y, [[0, "#e6d3a8"], [1, "#9c875f"]]);
    ctx.beginPath();
    ctx.moveTo(x - S * 0.05, y);
    ctx.lineTo(x - S * 0.05, y - S * 0.2);
    ctx.lineTo(x - S * 0.01, y - S * 0.17);
    ctx.lineTo(x + S * 0.02, y - S * 0.24);
    ctx.lineTo(x + S * 0.05, y - S * 0.15);
    ctx.lineTo(x + S * 0.05, y);
    ctx.closePath();
    ctx.fill();
  });
  // holographic build marker
  ctx.save();
  ctx.shadowColor = "#ffd47a";
  ctx.shadowBlur = S * 0.12;
  polygon(ctx, [[cx, cy - S * 0.2], [cx + S * 0.15, cy], [cx, cy + S * 0.2], [cx - S * 0.15, cy]]);
  ctx.strokeStyle = "rgba(255,226,150,0.95)";
  ctx.lineWidth = S * 0.022;
  ctx.stroke();
  ctx.fillStyle = "rgba(255,214,120,0.18)";
  ctx.fill();
  ctx.restore();
}

const SCENERY = { plains: drawPlains, forest: drawForest, mine: drawMine, energy_field: drawEnergy, city_site: drawCitySite };

export function renderTile(terrain, variant, hexSize) {
  const m = tileMetrics(hexSize);
  const canvas = makeCanvas(m.W, m.H);
  const ctx = canvas.getContext("2d");
  const pal = PALETTE[terrain];
  const rng = mulberry32(terrain.length * 7919 + variant * 104729 + 17);

  drawBase(ctx, m, pal, rng);
  ctx.save();
  hexPath(ctx, m.cx, m.cy, m.S * 0.97);
  ctx.clip();
  SCENERY[terrain](ctx, m, rng, variant);
  ctx.restore();
  drawRimAndVignette(ctx, m, pal);
  return { canvas, metrics: m };
}

// Registers every tile texture on the Phaser scene.
export function createTileTextures(scene, hexSize) {
  let metrics = null;
  for (const terrain of TERRAINS) {
    for (let v = 0; v < TILE_VARIANTS; v++) {
      const key = tileKey(terrain, v);
      if (scene.textures.exists(key)) continue;
      const { canvas, metrics: m } = renderTile(terrain, v, hexSize);
      scene.textures.addCanvas(key, canvas);
      metrics = m;
    }
  }
  return metrics || tileMetrics(hexSize);
}

export function variantFor(q, r) {
  return Math.abs(q * 7 + r * 13 + q * r) % TILE_VARIANTS;
}
