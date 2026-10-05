// Glowing connective path for active Supply Chains (spec.md §64). Drawn as
// a layered polyline between hex centers, colored by the owning player.

export function drawSupplyChains(graphics, chains, hexToScreen, colorForPlayerId) {
  for (const chain of chains) {
    if (!chain.active || chain.pathKeys.length < 2) continue;
    const color = colorForPlayerId(chain.playerId);
    const points = chain.pathKeys.map((key) => hexToScreen(key));

    for (let layer = 3; layer >= 1; layer--) {
      graphics.lineStyle(2 + layer * 2, color, 0.12 * layer);
      drawPolyline(graphics, points);
    }
    graphics.lineStyle(2.5, color, 0.95);
    drawPolyline(graphics, points);

    for (const p of points) {
      graphics.fillStyle(color, 1);
      graphics.fillCircle(p.x, p.y, 3.5);
    }
  }
}

function drawPolyline(graphics, points) {
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    graphics.lineTo(points[i].x, points[i].y);
  }
  graphics.strokePath();
}
