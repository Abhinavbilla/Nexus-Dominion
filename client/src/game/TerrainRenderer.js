import { fillHex, strokeHex } from "./HexRenderer.js";

// Color language per terrain (spec.md §66) approximated procedurally — no
// art pipeline, just vector fills + accent strokes that read clearly at a
// glance and stay inside the dark tactical-map palette.
export const TERRAIN_STYLE = {
  plains: { fill: 0x141f33, accent: 0x2a3b5c },
  forest: { fill: 0x0f2e22, accent: 0x33ffb0 },
  mine: { fill: 0x241a16, accent: 0xff9b4f },
  energy_field: { fill: 0x1c1a33, accent: 0xf5ff6e },
  city_site: { fill: 0x241630, accent: 0xd68bff },
};

export function drawTerrain(graphics, cx, cy, size, terrain) {
  const style = TERRAIN_STYLE[terrain] || TERRAIN_STYLE.plains;
  fillHex(graphics, cx, cy, size, style.fill, 1);
  strokeHex(graphics, cx, cy, size, style.accent, 1, 0.35);

  switch (terrain) {
    case "forest":
      drawForestAccent(graphics, cx, cy, size, style.accent);
      break;
    case "mine":
      drawMineAccent(graphics, cx, cy, size, style.accent);
      break;
    case "energy_field":
      drawEnergyAccent(graphics, cx, cy, size, style.accent);
      break;
    case "city_site":
      drawCitySiteAccent(graphics, cx, cy, size, style.accent);
      break;
    default:
      break;
  }
}

function drawForestAccent(g, cx, cy, size, color) {
  g.fillStyle(color, 0.8);
  const positions = [
    [-0.3, -0.2],
    [0.25, -0.05],
    [-0.05, 0.3],
  ];
  for (const [dx, dy] of positions) {
    g.fillCircle(cx + dx * size, cy + dy * size, size * 0.1);
  }
}

function drawMineAccent(g, cx, cy, size, color) {
  g.lineStyle(2, color, 0.75);
  g.beginPath();
  g.moveTo(cx - size * 0.4, cy + size * 0.2);
  g.lineTo(cx, cy - size * 0.25);
  g.lineTo(cx + size * 0.4, cy + size * 0.15);
  g.strokePath();
}

function drawEnergyAccent(g, cx, cy, size, color) {
  g.fillStyle(color, 0.9);
  g.fillCircle(cx, cy, size * 0.22);
  g.lineStyle(1.5, color, 0.5);
  g.strokeCircle(cx, cy, size * 0.4);
}

function drawCitySiteAccent(g, cx, cy, size, color) {
  g.fillStyle(color, 0.75);
  g.fillRect(cx - size * 0.28, cy - size * 0.05, size * 0.16, size * 0.3);
  g.fillRect(cx - size * 0.05, cy - size * 0.2, size * 0.16, size * 0.45);
  g.fillRect(cx + size * 0.18, cy - size * 0.1, size * 0.16, size * 0.35);
}
