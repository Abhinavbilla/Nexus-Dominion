import { fillHex, glowStrokeHex } from "./HexRenderer.js";

// Ownership tint + glowing border (spec.md §67). Fortified hexes get extra
// concentric rings so fortification level reads at a glance.
export function drawTerritory(graphics, cx, cy, size, { ownerColorHex, fortificationLevel = 0 }) {
  fillHex(graphics, cx, cy, size * 0.98, ownerColorHex, 0.1);
  glowStrokeHex(graphics, cx, cy, size * 0.98, ownerColorHex, { layers: 3, baseWidth: 2, baseAlpha: 0.3 });

  for (let i = 0; i < fortificationLevel; i++) {
    const ringSize = size * (0.72 - i * 0.12);
    graphics.lineStyle(1.5, ownerColorHex, 0.5 - i * 0.1);
    graphics.strokeCircle(cx, cy, ringSize);
  }
}

export function drawSelection(graphics, cx, cy, size, color = 0xffffff) {
  graphics.lineStyle(3, color, 0.9);
  graphics.strokeCircle(cx, cy, size * 1.05);
}

// Pulsing ring marking a valid action target (actual pulse animation is a
// tween on the whole highlight layer's alpha, driven by GameScene).
export function drawHighlight(graphics, cx, cy, size, color) {
  graphics.lineStyle(2.5, color, 1);
  graphics.strokeCircle(cx, cy, size * 0.78);
}
