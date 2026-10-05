// Pure geometry helpers for drawing pointy-top hexes with Phaser's Graphics
// API. Kept framework-light so the math is easy to unit-reason about; all
// Phaser-specific drawing happens in the renderer modules that call these.

export function hexCorners(size) {
  const corners = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i - 30);
    corners.push({ x: size * Math.cos(angle), y: size * Math.sin(angle) });
  }
  return corners;
}

export function drawHexPath(graphics, cx, cy, size) {
  const corners = hexCorners(size);
  graphics.beginPath();
  graphics.moveTo(cx + corners[0].x, cy + corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    graphics.lineTo(cx + corners[i].x, cy + corners[i].y);
  }
  graphics.closePath();
}

export function fillHex(graphics, cx, cy, size, color, alpha = 1) {
  graphics.fillStyle(color, alpha);
  drawHexPath(graphics, cx, cy, size);
  graphics.fillPath();
}

export function strokeHex(graphics, cx, cy, size, color, width = 2, alpha = 1) {
  graphics.lineStyle(width, color, alpha);
  drawHexPath(graphics, cx, cy, size);
  graphics.strokePath();
}

// Layered stroke to fake a soft glow without a shader pipeline: a few
// progressively wider, more transparent passes behind the crisp outline.
export function glowStrokeHex(graphics, cx, cy, size, color, { layers = 3, baseWidth = 2, baseAlpha = 0.35 } = {}) {
  for (let i = layers; i >= 1; i--) {
    strokeHex(graphics, cx, cy, size, color, baseWidth + i * 2.2, baseAlpha / i);
  }
  strokeHex(graphics, cx, cy, size, color, baseWidth, 1);
}
