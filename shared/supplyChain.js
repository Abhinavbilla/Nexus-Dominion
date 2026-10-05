import { BUILDING, RESOURCE_TERRAIN, TERRAIN } from "./constants.js";
import { getNeighbors, hexKey, isValidHex } from "./hexMath.js";

const SOURCE_TERRAINS = new Set([TERRAIN.FOREST, TERRAIN.MINE, TERRAIN.ENERGY_FIELD]);

function lexicographicCompare(a, b) {
  return a.q - b.q || a.r - b.r;
}

// BFS over hexes owned by `playerId`, starting from `source`, using the fixed
// canonical axial-neighbor order (spec.md §5, §78-79). Returns distance and
// parent maps keyed by "q,r" for every owned hex reachable from source.
function bfsOwnedTerritory(board, source, playerId, boardRadius) {
  const sourceKey = hexKey(source.q, source.r);
  const distance = new Map([[sourceKey, 0]]);
  const parent = new Map([[sourceKey, null]]);
  const queue = [source];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = hexKey(current.q, current.r);
    for (const n of getNeighbors(current.q, current.r)) {
      if (!isValidHex(n.q, n.r, boardRadius)) continue;
      const nKey = hexKey(n.q, n.r);
      if (distance.has(nKey)) continue;
      const cell = board.get(nKey);
      if (!cell || cell.ownerId !== playerId) continue;
      distance.set(nKey, distance.get(currentKey) + 1);
      parent.set(nKey, currentKey);
      queue.push(n);
    }
  }

  return { distance, parent };
}

function buildPath(parent, targetKey) {
  const path = [];
  let cur = targetKey;
  while (cur !== null && cur !== undefined) {
    path.push(cur);
    cur = parent.get(cur);
  }
  return path.reverse();
}

// Finds at most one active Supply Chain per qualifying source hex for a
// player (decisions.md #2, #3, #11). A source qualifies when it is Forest,
// Mine, or Energy Field, owned by the player, and has a Factory built on it.
// Among all owned Cities reachable via owned-hex adjacency, the minimum
// graph-distance City is selected; ties break by lexicographically smallest
// (q, r) (spec.md §26, §78).
export function findSupplyChainsForPlayer(board, playerId, boardRadius = 4) {
  const chains = [];

  const sourceCells = [];
  const cityCells = [];
  for (const cell of board.values()) {
    if (cell.ownerId !== playerId) continue;
    if (SOURCE_TERRAINS.has(cell.terrain) && cell.building === BUILDING.FACTORY) {
      sourceCells.push(cell);
    }
    if (cell.building === BUILDING.CITY) {
      cityCells.push(cell);
    }
  }

  if (cityCells.length === 0 || sourceCells.length === 0) return chains;

  for (const source of sourceCells) {
    const { distance, parent } = bfsOwnedTerritory(board, source, playerId, boardRadius);

    const reachableCities = cityCells
      .map((city) => ({ city, key: hexKey(city.q, city.r) }))
      .filter(({ key }) => distance.has(key));

    if (reachableCities.length === 0) continue;

    const minDistance = Math.min(...reachableCities.map(({ key }) => distance.get(key)));
    const candidates = reachableCities.filter(({ key }) => distance.get(key) === minDistance);
    candidates.sort((a, b) => lexicographicCompare(a.city, b.city));
    const selected = candidates[0];

    chains.push({
      sourceKey: hexKey(source.q, source.r),
      cityKey: selected.key,
      resourceType: RESOURCE_TERRAIN[source.terrain],
      pathKeys: buildPath(parent, selected.key),
      active: true,
    });
  }

  return chains;
}

export function findAllActiveSupplyChains(board, playerIds, boardRadius = 4) {
  const result = [];
  for (const playerId of playerIds) {
    for (const chain of findSupplyChainsForPlayer(board, playerId, boardRadius)) {
      result.push({ ...chain, playerId });
    }
  }
  return result;
}
