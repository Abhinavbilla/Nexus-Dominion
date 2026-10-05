import { makeCanvas, mulberry32, rand, pointInCircle, radialGradient, linearGradient, rgba, polygon, mix } from "./artUtils.js";

// Procedural "painted" space backdrop: deep gradient, drifting nebula clouds, stars with
// diffraction glints, a faint hex lattice and a vignette. Used behind the menu screens
// and behind the game board. Seeded so it is identical every launch.
export function renderBackdrop(w, h, seed = 7, { lattice = true } = {}) {
  const canvas = makeCanvas(w, h);
  const ctx = canvas.getContext("2d");
  const rng = mulberry32(seed);

  ctx.fillStyle = radialGradient(ctx, w * 0.5, h * 0.42, 0, Math.max(w, h) * 0.75, [[0, "#1a2140"], [0.55, "#0c1020"], [1, "#05070d"]]);
  ctx.fillRect(0, 0, w, h);

  // nebula clouds: overlapping soft blobs, additive
  ctx.globalCompositeOperation = "lighter";
  const clouds = [
    ["#5b3ea8", 0.16], ["#2a6f8f", 0.14], ["#a8761f", 0.1], ["#8f2f5a", 0.1], ["#2f4fb0", 0.14], ["#3a8f7a", 0.08],
  ];
  for (let i = 0; i < 26; i++) {
    const [color, a] = clouds[i % clouds.length];
    const x = rng() * w;
    const y = rng() * h;
    const r = rand(rng, Math.min(w, h) * 0.18, Math.min(w, h) * 0.5);
    ctx.fillStyle = radialGradient(ctx, x, y, 0, r, [[0, rgba(color, a)], [0.6, rgba(color, a * 0.35)], [1, rgba(color, 0)]]);
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
  }
  ctx.globalCompositeOperation = "source-over";

  // faint hex lattice
  if (lattice) {
    const size = Math.max(w, h) / 22;
    ctx.strokeStyle = "rgba(233,180,76,0.045)";
    ctx.lineWidth = 1;
    for (let r = -2; r < h / (size * 1.5) + 2; r++) {
      for (let q = -2; q < w / (size * Math.sqrt(3)) + 2; q++) {
        const x = size * Math.sqrt(3) * (q + (r % 2) * 0.5);
        const y = size * 1.5 * r;
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 180) * (60 * i - 30);
          pts.push([x + size * 0.96 * Math.cos(a), y + size * 0.96 * Math.sin(a)]);
        }
        polygon(ctx, pts);
        ctx.stroke();
      }
    }
  }

  // stars
  for (let i = 0; i < Math.floor((w * h) / 2600); i++) {
    const x = rng() * w;
    const y = rng() * h;
    const r = rng() < 0.04 ? rand(rng, 1.4, 2.2) : rand(rng, 0.3, 1);
    const tint = rng() < 0.2 ? "255,214,150" : rng() < 0.4 ? "170,200,255" : "255,255,255";
    ctx.fillStyle = `rgba(${tint},${rand(rng, 0.25, 0.95)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (r > 1.4) {
      ctx.strokeStyle = `rgba(${tint},0.35)`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(x - r * 4, y);
      ctx.lineTo(x + r * 4, y);
      ctx.moveTo(x, y - r * 4);
      ctx.lineTo(x, y + r * 4);
      ctx.stroke();
    }
  }

  // vignette
  ctx.fillStyle = radialGradient(ctx, w / 2, h / 2, Math.min(w, h) * 0.35, Math.max(w, h) * 0.78, [[0, "rgba(0,0,0,0)"], [1, "rgba(0,0,0,0.65)"]]);
  ctx.fillRect(0, 0, w, h);
  return canvas;
}

// The board's base: a stepped, terraced plinth. Three descending ledges (each with its own lit top,
// shaded wall and brass inlay) lead up to a brass-trimmed top tier, so the edge reads as solid
// architecture instead of a single line. Flat-top hexagon, extruded.
export function renderPlinth(hexSize, boardRadius) {
  const scale = 2;
  const K = Math.sqrt(3) / 2; // regular flat-top hexagon: height = R * sqrt(3)
  const R = (hexSize * Math.sqrt(3) * boardRadius + hexSize * 1.25) * scale; // top tier radius
  const STEPS = [1.25, 1.17, 1.09]; // ledge radii (outer -> inner) as multiples of R
  const levels = STEPS.length;
  const H = hexSize * 0.36 * scale; // height of one step
  const D = hexSize * 0.5 * scale; // base wall under the whole structure
  const pad = hexSize * 2.2 * scale;
  const Rmax = R * STEPS[0];
  const W = Math.ceil(Rmax * 2 + pad * 2);
  const Ht = Math.ceil(Rmax * 2 * K + D + (levels + 1) * H + pad * 2);
  const canvas = makeCanvas(W, Ht);
  const ctx = canvas.getContext("2d");
  const cx = W / 2;
  const cy = pad + Rmax * K; // centre of the TOP tier surface (where the tiles sit)

  const hex = (x, y, r) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i);
      pts.push([x + r * Math.cos(a), y + r * Math.sin(a)]);
    }
    polygon(ctx, pts);
  };
  const lerp = (a, b, t) => a + (b - a) * t;

  // light from the upper left: edges facing it get a highlight, the others a shadow
  const bevel = (x, y, r, strength = 1) => {
    const light = (-135 * Math.PI) / 180;
    for (let i = 0; i < 6; i++) {
      const a0 = (Math.PI / 180) * (60 * i);
      const a1 = (Math.PI / 180) * (60 * (i + 1));
      const facing = Math.cos((Math.PI / 180) * (60 * i + 30) - light);
      ctx.beginPath();
      ctx.moveTo(x + (r - 1) * Math.cos(a0), y + (r - 1) * Math.sin(a0));
      ctx.lineTo(x + (r - 1) * Math.cos(a1), y + (r - 1) * Math.sin(a1));
      ctx.lineWidth = hexSize * 0.05 * scale;
      ctx.lineCap = "round";
      ctx.strokeStyle = facing > 0 ? `rgba(255,255,255,${0.32 * facing * strength})` : `rgba(0,0,0,${0.5 * -facing * strength})`;
      ctx.stroke();
    }
  };

  const wall = (y, r, depth, top, bottom) => {
    for (let k = Math.ceil(depth); k >= 0; k--) {
      hex(cx, y + k, r);
      ctx.fillStyle = mix(top, bottom, k / depth);
      ctx.fill();
    }
  };

  const top = (y, r, c0, c1) => {
    hex(cx, y, r);
    ctx.fillStyle = linearGradient(ctx, cx - r, y - r, cx + r, y + r, [[0, c0], [1, c1]]);
    ctx.fill();
  };

  // ---- ground shadow + base wall under the whole structure
  const yOuter = cy + levels * H;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = hexSize * 1.4 * scale;
  ctx.shadowOffsetY = D * 0.9;
  hex(cx, yOuter + H + D, Rmax);
  ctx.fillStyle = "#080a12";
  ctx.fill();
  ctx.restore();

  // ---- ledges, outermost (lowest) first; each one overlaps the one below it
  const LEDGE = [
    { top: ["#3b466c", "#262e4c"], wall: ["#59679f", "#0d1124"] },
    { top: ["#48558a", "#2e385e"], wall: ["#6877b4", "#131830"] },
    { top: ["#5868a0", "#38436c"], wall: ["#7686c2", "#181e3a"] },
  ];
  STEPS.forEach((mult, t) => {
    const r = R * mult;
    const y = cy + (levels - t) * H;
    wall(y, r, t === 0 ? H + D : H, LEDGE[t].wall[0], LEDGE[t].wall[1]);
    top(y, r, LEDGE[t].top[0], LEDGE[t].top[1]);
    bevel(cx, y, r, 1.5);
    // heavy brass lip along the outer edge of every step
    hex(cx, y, r * 0.997);
    ctx.strokeStyle = linearGradient(ctx, cx - r, y - r, cx + r, y + r, [[0, "#ffe9a8"], [0.45, "#c78f2c"], [1, "#fff0b8"]]);
    ctx.lineWidth = hexSize * 0.1 * scale;
    ctx.stroke();
    // brass inlay running around the middle of the visible ledge band
    const inner = t + 1 < levels ? R * STEPS[t + 1] : R;
    const mid = (r + inner) / 2;
    if (t !== 1) {
      hex(cx, y, mid);
      ctx.strokeStyle = t === 0 ? "rgba(233,180,76,0.9)" : "rgba(255,214,120,1)";
      ctx.lineWidth = 4 * scale;
      ctx.stroke();
    }
  });

  // ---- top tier wall + surface
  wall(cy, R, H, "#4a3a17", "#1a1408");
  top(cy, R, "#2a3453", "#10162a");

  // brass rim
  hex(cx, cy, R * 0.995);
  ctx.strokeStyle = linearGradient(ctx, cx - R, cy - R, cx + R, cy + R, [[0, "#ffd988"], [0.5, "#b07d22"], [1, "#ffd988"]]);
  ctx.lineWidth = hexSize * 0.26 * scale;
  ctx.stroke();
  hex(cx, cy, R * 0.94);
  ctx.strokeStyle = "rgba(233,180,76,0.55)";
  ctx.lineWidth = 2.6 * scale;
  ctx.stroke();

  // tick marks between the rims
  for (let i = 0; i < 6; i++) {
    for (let t = 1; t < 12; t++) {
      const a0 = (Math.PI / 180) * (60 * i);
      const a1 = (Math.PI / 180) * (60 * (i + 1));
      const f = t / 12;
      const x = cx + R * 0.975 * (Math.cos(a0) * (1 - f) + Math.cos(a1) * f);
      const y = cy + R * 0.975 * (Math.sin(a0) * (1 - f) + Math.sin(a1) * f);
      ctx.fillStyle = t % 3 === 0 ? "rgba(233,180,76,0.7)" : "rgba(233,180,76,0.28)";
      ctx.beginPath();
      ctx.arc(x, y, (t % 3 === 0 ? 2.2 : 1.3) * scale, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // inner surface sheen
  ctx.save();
  hex(cx, cy, R * 0.95);
  ctx.clip();
  ctx.fillStyle = radialGradient(ctx, cx - R * 0.3, cy - R * 0.4, 0, R * 1.1, [[0, "rgba(120,150,255,0.14)"], [1, "rgba(0,0,0,0)"]]);
  ctx.fillRect(0, 0, W, Ht);
  ctx.restore();

  // ---- brass corner studs on the ledges (like bolted corner blocks)
  const stud = (x, y, r) => {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(x + r * 0.12, y + r * 0.18, r * 1.05, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = radialGradient(ctx, x - r * 0.35, y - r * 0.4, r * 0.1, r * 1.1, [[0, "#fff0b8"], [0.5, "#d9a441"], [1, "#7a5110"]]);
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(60,36,4,0.7)";
    ctx.lineWidth = 1.2 * scale;
    ctx.stroke();
    ctx.fillStyle = "rgba(60,36,4,0.55)";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
  };
  [0, 2].forEach((t) => {
    const y = cy + (levels - t) * H;
    const r = R * lerp(STEPS[t], t + 1 < levels ? STEPS[t + 1] : 1, 0.5);
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i);
      stud(cx + r * Math.cos(a), y + r * Math.sin(a), hexSize * (t === 0 ? 0.36 : 0.27) * scale);
    }
  });

  return {
    canvas,
    scale,
    cx,
    cy,
    W,
    H: Ht,
    // extents used to frame the whole structure, steps included, in the camera
    fitW: (2 * Rmax) / scale + hexSize * 0.6,
    fitH: (2 * Rmax * K + D + (levels + 1) * H) / scale + hexSize * 0.6,
    // the steps and base wall hang below the board centre, so the camera centres a bit lower
    dropY: ((levels + 1) * H + D) / scale,
  };
}

export function backdropDataUrl(w = 1600, h = 1000, seed = 7) {
  return renderBackdrop(w, h, seed).toDataURL("image/jpeg", 0.85);
}
