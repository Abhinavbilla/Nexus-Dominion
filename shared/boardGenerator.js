import { TERRAIN } from "./constants.js";
import { enumerateBoardHexes, hexKey, distanceBetweenHexes } from "./hexMath.js";

// Mulberry32 seeded PRNG (spec.md §6.2). Returns a function producing floats
// in [0, 1); the same seed always produces the same sequence.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle(array, rng) {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildTerrainTokenList(terrainCounts, reservedCount) {
  const tokens = [];
  for (const [terrain, count] of Object.entries(terrainCounts)) {
    const remaining = terrain === TERRAIN.PLAINS ? count - reservedCount : count;
    for (let i = 0; i < remaining; i++) tokens.push(terrain);
  }
  return tokens;
}

function nearestDistance(from, terrainType, cellsByKey) {
  let best = Infinity;
  for (const cell of cellsByKey.values()) {
    if (cell.terrain === terrainType) {
      const d = distanceBetweenHexes(from, cell);
      if (d < best) best = d;
    }
  }
  return best;
}

// Fairness test (spec.md §6.3 / decisions.md #10): for every starting
// coordinate, nearest Forest/Mine/Energy Field must be within maxDistance,
// and the max difference between players' three-distance sums must be <= maxSumDiff.
export function checkFairness(cellsByKey, startingPositions, { maxDistance, maxSumDiff }) {
  const sums = startingPositions.map((start) => {
    const dForest = nearestDistance(start, TERRAIN.FOREST, cellsByKey);
    const dMine = nearestDistance(start, TERRAIN.MINE, cellsByKey);
    const dEnergy = nearestDistance(start, TERRAIN.ENERGY_FIELD, cellsByKey);
    if (dForest > maxDistance || dMine > maxDistance || dEnergy > maxDistance) {
      return null;
    }
    return dForest + dMine + dEnergy;
  });

  if (sums.some((s) => s === null)) return false;

  const max = Math.max(...sums);
  const min = Math.min(...sums);
  return max - min <= maxSumDiff;
}

function generateAttempt(seed, config) {
  const { TERRAIN_COUNTS, BOARD_RADIUS, STARTING_POSITIONS } = config;
  const allHexes = enumerateBoardHexes(BOARD_RADIUS); // canonical lexicographic order
  const startKeys = new Set(STARTING_POSITIONS.map((p) => hexKey(p.q, p.r)));

  const nonStartHexes = allHexes.filter((h) => !startKeys.has(hexKey(h.q, h.r)));
  const tokens = buildTerrainTokenList(TERRAIN_COUNTS, STARTING_POSITIONS.length);

  const rng = mulberry32(seed);
  const shuffledTokens = seededShuffle(tokens, rng);

  const cellsByKey = new Map();
  for (const start of STARTING_POSITIONS) {
    cellsByKey.set(hexKey(start.q, start.r), {
      q: start.q,
      r: start.r,
      terrain: TERRAIN.PLAINS,
      ownerId: null,
      building: null,
      fortificationLevel: 0,
    });
  }
  nonStartHexes.forEach((hex, i) => {
    cellsByKey.set(hexKey(hex.q, hex.r), {
      q: hex.q,
      r: hex.r,
      terrain: shuffledTokens[i],
      ownerId: null,
      building: null,
      fortificationLevel: 0,
    });
  });

  return cellsByKey;
}

// Deterministic generation procedure (spec.md §6.2). On fairness failure,
// derive nextSeed = (seed + 0x9E3779B9) >>> 0 and retry; the accepted seed is
// recorded as boardSeed while the original seed stays the match seed.
export function generateBoard(initialSeed, config, { maxAttempts = 1000 } = {}) {
  let seed = initialSeed >>> 0;
  const fairnessOpts = {
    maxDistance: config.FAIRNESS.MAX_RESOURCE_DISTANCE,
    maxSumDiff: config.FAIRNESS.MAX_SUM_DIFFERENCE,
  };

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const cellsByKey = generateAttempt(seed, config);
    if (checkFairness(cellsByKey, config.STARTING_POSITIONS, fairnessOpts)) {
      return { boardSeed: seed, cells: cellsByKey };
    }
    seed = (seed + config.FAIRNESS.SEED_INCREMENT) >>> 0;
  }
  throw new Error("boardGenerator: no fair board found within maxAttempts");
}
