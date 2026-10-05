import { AXIAL_DIRECTIONS } from "./constants.js";

export function hexKey(q, r) {
  return `${q},${r}`;
}

export function parseHexKey(key) {
  const [q, r] = key.split(",").map(Number);
  return { q, r };
}

export function isValidHex(q, r, radius = 4) {
  return Math.max(Math.abs(q), Math.abs(r), Math.abs(q + r)) <= radius;
}

// Returns neighbors in the canonical fixed order (spec.md §5), including
// hexes that may fall outside the board — callers filter with isValidHex.
export function getNeighbors(q, r) {
  return AXIAL_DIRECTIONS.map((d) => ({ q: q + d.q, r: r + d.r }));
}

export function distanceBetweenHexes(a, b) {
  return (Math.abs(a.q - b.q) + Math.abs(a.r - b.r) + Math.abs(a.q + a.r - b.q - b.r)) / 2;
}

export function isAdjacent(a, b) {
  return distanceBetweenHexes(a, b) === 1;
}

// All 61 valid hexes in canonical lexicographic (q, r) order, as used by the
// board generator for deterministic token assignment.
export function enumerateBoardHexes(radius = 4) {
  const hexes = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (isValidHex(q, r, radius)) {
        hexes.push({ q, r });
      }
    }
  }
  // (q, r) pairs are already generated in ascending q then ascending r order,
  // which is lexicographic — no extra sort needed, but make the contract explicit.
  hexes.sort((a, b) => (a.q - b.q) || (a.r - b.r));
  return hexes;
}

export function axialToPixel(q, r, size) {
  const x = size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r);
  const y = size * (1.5 * r);
  return { x, y };
}

// Inverse of axialToPixel with cube-coordinate rounding, so an arbitrary
// pointer position snaps to the nearest hex (used for board click handling).
export function pixelToAxial(x, y, size) {
  const r = (2 / 3) * (y / size);
  const q = x / (size * Math.sqrt(3)) - r / 2;
  return roundToHex(q, r);
}

function roundToHex(q, r) {
  let cx = q;
  let cz = r;
  let cy = -cx - cz;

  let rx = Math.round(cx);
  let ry = Math.round(cy);
  let rz = Math.round(cz);

  const dx = Math.abs(rx - cx);
  const dy = Math.abs(ry - cy);
  const dz = Math.abs(rz - cz);

  if (dx > dy && dx > dz) {
    rx = -ry - rz;
  } else if (dy > dz) {
    ry = -rx - rz;
  } else {
    rz = -rx - ry;
  }

  return { q: rx, r: rz };
}
