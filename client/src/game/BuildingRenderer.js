// Simple vector glyphs per building type (spec.md §68) — no sprite sheet
// needed, each is a few Phaser Graphics calls colored by owner.

export function drawBuilding(graphics, cx, cy, size, building, ownerColorHex) {
  switch (building) {
    case "command_hub":
      drawCommandHub(graphics, cx, cy, size, ownerColorHex);
      break;
    case "factory":
      drawFactory(graphics, cx, cy, size, ownerColorHex);
      break;
    case "fortress":
      drawFortress(graphics, cx, cy, size, ownerColorHex);
      break;
    case "city":
      drawCity(graphics, cx, cy, size, ownerColorHex);
      break;
    default:
      break;
  }
}

function drawCommandHub(g, cx, cy, size, color) {
  const r = size * 0.32;
  g.lineStyle(2.5, color, 1);
  g.beginPath();
  g.moveTo(cx, cy - r);
  g.lineTo(cx + r, cy);
  g.lineTo(cx, cy + r);
  g.lineTo(cx - r, cy);
  g.closePath();
  g.strokePath();
  g.fillStyle(color, 0.25);
  g.fillPath();
  g.fillStyle(color, 1);
  g.fillCircle(cx, cy, r * 0.25);
}

function drawFactory(g, cx, cy, size, color) {
  const s = size * 0.32;
  g.fillStyle(0x0a0e18, 0.9);
  g.fillRect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
  g.lineStyle(2, color, 1);
  g.strokeRect(cx - s, cy - s * 0.7, s * 2, s * 1.4);
  g.beginPath();
  g.moveTo(cx - s * 0.4, cy - s * 0.7);
  g.lineTo(cx - s * 0.4, cy - s * 1.3);
  g.moveTo(cx + s * 0.4, cy - s * 0.7);
  g.lineTo(cx + s * 0.4, cy - s * 1.1);
  g.strokePath();
}

function drawFortress(g, cx, cy, size, color) {
  const s = size * 0.34;
  g.fillStyle(0x0a0e18, 0.9);
  g.beginPath();
  g.moveTo(cx, cy - s);
  g.lineTo(cx + s, cy - s * 0.3);
  g.lineTo(cx + s * 0.7, cy + s);
  g.lineTo(cx - s * 0.7, cy + s);
  g.lineTo(cx - s, cy - s * 0.3);
  g.closePath();
  g.fillPath();
  g.lineStyle(2.2, color, 1);
  g.strokePath();
}

function drawCity(g, cx, cy, size, color) {
  const s = size * 0.3;
  g.fillStyle(0x0a0e18, 0.9);
  g.fillRect(cx - s * 0.9, cy - s * 0.2, s * 0.6, s * 1.2);
  g.fillRect(cx - s * 0.15, cy - s * 0.9, s * 0.6, s * 1.9);
  g.fillRect(cx + s * 0.55, cy - s * 0.4, s * 0.6, s * 1.4);
  g.lineStyle(1.8, color, 1);
  g.strokeRect(cx - s * 0.9, cy - s * 0.2, s * 0.6, s * 1.2);
  g.strokeRect(cx - s * 0.15, cy - s * 0.9, s * 0.6, s * 1.9);
  g.strokeRect(cx + s * 0.55, cy - s * 0.4, s * 0.6, s * 1.4);
}
