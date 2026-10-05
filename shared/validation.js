import { BUILDING, TERRAIN } from "./constants.js";
import { getNeighbors, hexKey, isValidHex } from "./hexMath.js";

const FACTORY_TERRAINS = new Set([TERRAIN.PLAINS, TERRAIN.FOREST, TERRAIN.MINE, TERRAIN.ENERGY_FIELD]);
const CITY_TERRAINS = new Set([TERRAIN.PLAINS, TERRAIN.CITY_SITE]);

function invalid(reason) {
  return { valid: false, reason };
}
const VALID = { valid: true };

function hasAdjacentOwnedBy(board, hex, playerId, boardRadius) {
  return getNeighbors(hex.q, hex.r).some((n) => {
    if (!isValidHex(n.q, n.r, boardRadius)) return false;
    const cell = board.get(hexKey(n.q, n.r));
    return cell && cell.ownerId === playerId;
  });
}

function hasSufficientResources(player, cost) {
  for (const resource of ["wood", "metal", "energy"]) {
    if (cost[resource] && player.resources[resource] < cost[resource]) return false;
  }
  return true;
}

// spec.md §16
export function validateClaim({ board, player, target, boardRadius = 4 }) {
  if (player.actionPoints < 1) return invalid("No Action Points remaining");
  if (!target) return invalid("Invalid hex");
  if (target.ownerId !== null) return invalid("Hex is not neutral");
  if (!hasAdjacentOwnedBy(board, target, player.id, boardRadius)) {
    return invalid("Target hex is not adjacent to your territory");
  }
  return VALID;
}

// spec.md §18-21
export function validateBuild({ board, player, target, buildingType, config, boardRadius = 4 }) {
  if (player.actionPoints < 1) return invalid("No Action Points remaining");
  if (!target) return invalid("Invalid hex");
  if (target.ownerId !== player.id) return invalid("You do not own this hex");
  if (target.building !== BUILDING.NONE) return invalid("Hex cannot contain this structure");

  const cost = config.BUILD_COSTS[buildingType];
  if (!cost) return invalid("Unknown building type");
  if (!hasSufficientResources(player, cost)) return invalid("Insufficient resources");

  if (buildingType === BUILDING.FACTORY) {
    if (!FACTORY_TERRAINS.has(target.terrain)) return invalid("Hex cannot contain this structure");
  } else if (buildingType === BUILDING.CITY) {
    if (!CITY_TERRAINS.has(target.terrain)) return invalid("Hex cannot contain this structure");
    const cityCount = countPlayerCities(board, player.id);
    if (cityCount >= config.BUILD_LIMITS.MAX_CITIES_PER_PLAYER) return invalid("Maximum Cities reached");
  } else if (buildingType === BUILDING.FORTRESS) {
    // Any owned hex is valid; command_hub slots are already excluded above.
  } else {
    return invalid("Unknown building type");
  }

  return VALID;
}

function countPlayerCities(board, playerId) {
  let count = 0;
  for (const cell of board.values()) {
    if (cell.ownerId === playerId && cell.building === BUILDING.CITY) count++;
  }
  return count;
}

// spec.md §28
export function validateAttack({ board, attacker, target, config, boardRadius = 4 }) {
  if (attacker.actionPoints < 1) return invalid("No Action Points remaining");
  if (!target) return invalid("Invalid hex");
  if (!hasSufficientResources(attacker, config.ATTACK_COSTS)) return invalid("Insufficient resources");
  if (!target.ownerId || target.ownerId === attacker.id) return invalid("Target must belong to another player");
  if (target.building === BUILDING.COMMAND_HUB) return invalid("Command Hub cannot be attacked");
  if (!hasAdjacentOwnedBy(board, target, attacker.id, boardRadius)) {
    return invalid("Target is not adjacent to your territory");
  }
  return VALID;
}

// spec.md §34
export function validateFortify({ player, target, config }) {
  if (player.actionPoints < 1) return invalid("No Action Points remaining");
  if (!target) return invalid("Invalid hex");
  if (target.ownerId !== player.id) return invalid("You do not own this hex");
  if (target.building === BUILDING.COMMAND_HUB) return invalid("Command Hub cannot be fortified");
  if (!hasSufficientResources(player, config.FORTIFY_COSTS)) return invalid("Insufficient resources");
  if (target.fortificationLevel >= config.DEFENSE_VALUES.MAX_FORTIFICATION_LEVEL) {
    return invalid("Maximum fortification level reached");
  }
  return VALID;
}
