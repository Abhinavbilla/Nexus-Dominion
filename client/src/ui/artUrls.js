import { renderTile } from "../game/art/tileArt.js";
import { renderBuilding } from "../game/art/buildingArt.js";

// Cached PNG data URLs of the game's own tile / building art, for illustrations and cards.
const cache = new Map();

export function tileUrl(terrain, variant = 0, hexSize = 20) {
  const key = `t:${terrain}:${variant}:${hexSize}`;
  if (!cache.has(key)) cache.set(key, renderTile(terrain, variant, hexSize).canvas.toDataURL("image/png"));
  return cache.get(key);
}

export function buildingUrl(type, color = "#4c8dff", hexSize = 20) {
  const key = `b:${type}:${color}:${hexSize}`;
  if (!cache.has(key)) cache.set(key, renderBuilding(type, color, hexSize).canvas.toDataURL("image/png"));
  return cache.get(key);
}
