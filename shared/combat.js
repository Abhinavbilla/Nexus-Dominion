import { BUILDING } from "./constants.js";
import { getNeighbors, hexKey, isValidHex } from "./hexMath.js";

// Pure combat functions (spec.md §80, §29-31). `board` is a Map<string, HexCell>
// keyed by "q,r". All inputs are plain data; given the same inputs these
// functions always return the same output.

export function countAdjacentFriendlyHexes(board, hex, playerId, boardRadius = 4) {
  return getNeighbors(hex.q, hex.r).filter((n) => {
    if (!isValidHex(n.q, n.r, boardRadius)) return false;
    const cell = board.get(hexKey(n.q, n.r));
    return cell && cell.ownerId === playerId;
  }).length;
}

// `targetHex` is the hex being attacked — support counts how many of ITS
// neighbors the attacker already owns (the hexes "supporting the attack" by
// surrounding the target), not the attacker's own adjacency elsewhere.
export function calculateAttackStrength({ board, targetHex, attackerId, hasActiveSupplyChain, config, boardRadius = 4 }) {
  const { BASE_ATTACK, SUPPORT_BONUS, SUPPORT_MIN_ADJACENT_FRIENDLY, SUPPLY_CHAIN_BONUS, MAX_ATTACK_STRENGTH } =
    config.ATTACK_VALUES;

  const breakdown = { base: BASE_ATTACK, support: 0, supplyChain: 0 };

  const friendlyAdjacent = countAdjacentFriendlyHexes(board, targetHex, attackerId, boardRadius);
  if (friendlyAdjacent >= SUPPORT_MIN_ADJACENT_FRIENDLY) {
    breakdown.support = SUPPORT_BONUS;
  }
  if (hasActiveSupplyChain) {
    breakdown.supplyChain = SUPPLY_CHAIN_BONUS;
  }

  const rawTotal = breakdown.base + breakdown.support + breakdown.supplyChain;
  const total = Math.min(rawTotal, MAX_ATTACK_STRENGTH);
  return { total, breakdown };
}

export function calculateDefenseStrength({ targetHex, config }) {
  const { BASE_DEFENSE, FORTRESS_BONUS, CITY_BONUS, FORTIFICATION_PER_LEVEL } = config.DEFENSE_VALUES;

  const breakdown = { base: BASE_DEFENSE, fortress: 0, city: 0, fortification: 0 };

  if (targetHex.building === BUILDING.FORTRESS) breakdown.fortress = FORTRESS_BONUS;
  if (targetHex.building === BUILDING.CITY) breakdown.city = CITY_BONUS;
  breakdown.fortification = (targetHex.fortificationLevel || 0) * FORTIFICATION_PER_LEVEL;

  const total = breakdown.base + breakdown.fortress + breakdown.city + breakdown.fortification;
  return { total, breakdown };
}

export function resolveAttack(attackStrength, defenseStrength) {
  return attackStrength >= defenseStrength ? "SUCCESS" : "FAILED";
}
