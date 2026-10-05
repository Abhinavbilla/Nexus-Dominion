import { BUILDING, RESOURCE_TERRAIN, TERRAIN } from "../../shared/constants.js";
import { getNeighbors, hexKey, isValidHex } from "../../shared/hexMath.js";

export function resourceTotal(player) {
  return player.resources.wood + player.resources.metal + player.resources.energy;
}

function neighborCells(state, cell, boardRadius) {
  const result = [];
  for (const n of getNeighbors(cell.q, cell.r)) {
    if (!isValidHex(n.q, n.r, boardRadius)) continue;
    const neighbor = state.board.get(hexKey(n.q, n.r));
    if (neighbor) result.push(neighbor);
  }
  return result;
}

// Per-round resource income of a player (mirrors ResourceManager's rules)
// from the board and active Supply Chains. Used to measure how much an action
// changes future production.
export function estimateIncome(state, config, playerId) {
  let total = 0;
  for (const cell of state.board.values()) {
    if (cell.ownerId !== playerId) continue;
    if (RESOURCE_TERRAIN[cell.terrain]) {
      total += 1;
      if (cell.building === BUILDING.FACTORY) total += config.RESOURCE_GENERATION.factory_bonus;
    } else if (cell.terrain === TERRAIN.PLAINS && cell.building === BUILDING.FACTORY) {
      total += config.RESOURCE_GENERATION.factory_on_plains_energy;
    }
  }
  const chains = state.activeSupplyChains.filter((c) => c.playerId === playerId).length;
  return total + chains * config.RESOURCE_GENERATION.supply_chain_bonus;
}

// How many future-chain steps an action moves the player toward: a Factory on
// a source with no City yet, or a City when Factories already exist, is worth
// more than an isolated building. Returns a count of "unrealized" source/City
// pairings the building participates in.
export function chainPotential(state, cell, playerId) {
  let sources = 0;
  let cities = 0;
  for (const c of state.board.values()) {
    if (c.ownerId !== playerId) continue;
    if (c.building === BUILDING.FACTORY && RESOURCE_TERRAIN[c.terrain]) sources++;
    if (c.building === BUILDING.CITY) cities++;
  }
  const chains = state.activeSupplyChains.filter((c) => c.playerId === playerId).length;
  const unlinkedSources = Math.max(0, sources - chains);
  if (cell.building === BUILDING.CITY) return unlinkedSources;
  if (cell.building === BUILDING.FACTORY && RESOURCE_TERRAIN[cell.terrain]) return cities > 0 ? 1 : 0.5;
  return 0;
}

// Enemy pressure on a hex: number of adjacent hexes owned by other players.
export function enemyNeighborCount(state, cell, playerId, boardRadius) {
  return neighborCells(state, cell, boardRadius).filter((n) => n.ownerId && n.ownerId !== playerId).length;
}

// Value of owning a hex for later expansion: neutral neighbors plus terrain.
export function expansionValue(state, cell, boardRadius) {
  const neutralNeighbors = neighborCells(state, cell, boardRadius).filter((n) => n.ownerId === null).length;
  let terrainValue = 0;
  if (RESOURCE_TERRAIN[cell.terrain]) terrainValue = 1;
  else if (cell.terrain === TERRAIN.CITY_SITE) terrainValue = 2;
  return neutralNeighbors * 0.25 + terrainValue;
}

// True when the hex lies on one of the player's active chain paths.
export function isOnChainPath(state, playerId, key) {
  return state.activeSupplyChains.some((c) => c.playerId === playerId && c.pathKeys.includes(key));
}
