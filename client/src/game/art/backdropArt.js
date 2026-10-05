import { makeCanvas, mulberry32, rand, pointInCircle, radialGradient, linearGradient, rgba, polygon } from "./artUtils.js";

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

// The brass-rimmed plinth the board sits on (flat-top hexagon, extruded).
export function renderPlinth(hexSize, boardRadius) {
  const scale = 2;
  const K = Math.sqrt(3) / 2; // regular flat-top hexagon: height = R * sqrt(3)
  const R = (hexSize * Math.sqrt(3) * boardRadius + hexSize * 1.25) * scale;
  const D = hexSize * 0.7 * scale;
  const pad = hexSize * 2.2 * scale;
  const W = Math.ceil(R * 2 + pad * 2);
  const H = Math.ceil(R * 2 * K + D + pad * 2);
  const canvas = makeCanvas(W, H);
  const ctx = canvas.getContext("2d");
  const cx = W / 2;
  const cy = pad + R * K;

  const hex = (x, y, r) => {
    const pts = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i);
      pts.push([x + r * Math.cos(a), y + r * K * Math.sin(a) / Math.sin(Math.PI / 3)]);
    }
    polygon(ctx, pts);
  };

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = hexSize * 1.4 * scale;
  ctx.shadowOffsetY = D * 0.9;
  hex(cx, cy + D, R);
  ctx.fillStyle = "#0a0d16";
  ctx.fill();
  ctx.restore();

  for (let k = Math.ceil(D); k >= 0; k--) {
    hex(cx, cy + k, R);
    ctx.fillStyle = k > D * 0.2 ? "#1a1f31" : "#2a3350";
    ctx.fill();
  }

  hex(cx, cy, R);
  ctx.fillStyle = linearGradient(ctx, cx - R, cy - R, cx + R, cy + R, [[0, "#2a3453"], [1, "#10162a"]]);
  ctx.fill();

  // brass rim
  hex(cx, cy, R * 0.995);
  ctx.strokeStyle = linearGradient(ctx, cx - R, cy - R, cx + R, cy + R, [[0, "#ffd988"], [0.5, "#b07d22"], [1, "#ffd988"]]);
  ctx.lineWidth = hexSize * 0.16 * scale;
  ctx.stroke();
  hex(cx, cy, R * 0.955);
  ctx.strokeStyle = "rgba(233,180,76,0.35)";
  ctx.lineWidth = 1.5 * scale;
  ctx.stroke();

  // tick marks between rims
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
  ctx.fillRect(0, 0, W, H);
  ctx.restore();

  return { canvas, scale, cx, cy, W, H };
}

export function backdropDataUrl(w = 1600, h = 1000, seed = 7) {
  return renderBackdrop(w, h, seed).toDataURL("image/jpeg", 0.85);
}
