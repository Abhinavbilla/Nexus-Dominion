import { BUILDING, TERRAIN } from "@hex-dominion/shared/constants.js";
import { hexKey } from "@hex-dominion/shared/hexMath.js";
import { validateClaim, validateBuild, validateAttack, validateFortify } from "@hex-dominion/shared/validation.js";
import { calculateAttackStrength, calculateDefenseStrength, resolveAttack } from "@hex-dominion/shared/combat.js";
import { findSupplyChainsForPlayer } from "@hex-dominion/shared/supplyChain.js";

// Every state-changing action resolves in this exact order (spec.md §36):
// validate -> spend resources -> spend Action Point -> apply action ->
// recalculate affected Supply Chains -> award newly earned Dominion ->
// check victory -> create event metadata -> (caller broadcasts full state).

function spend(player, cost) {
  for (const resource of ["wood", "metal", "energy"]) {
    if (cost[resource]) {
      player.resources[resource] -= cost[resource];
      player.stats.resourcesSpent += cost[resource];
    }
  }
}

export function checkVictory(state, config) {
  if (state.status !== "playing") return;
  if (config.VICTORY_AT_ROUND_END) {
    // Every player gets the same number of turns; the winner is decided when the round ends.
    if (state.players.some((p) => p.dominionPoints >= config.VICTORY_SCORE)) state.thresholdReached = true;
    return;
  }
  const winner = state.players.find((p) => p.dominionPoints >= config.VICTORY_SCORE);
  if (winner) {
    state.status = "finished";
    state.winnerId = winner.id;
    state.winReason = "dominion_threshold";
  }
}

// Recomputes Supply Chains for the given player IDs only (decisions.md #12),
// merges them into state.activeSupplyChains, and awards Dominion for any
// newly completed unique (playerId, sourceHex) chain per spec.md §26.
function recalcSupplyChains(state, config, affectedPlayerIds) {
  const previousAffected = state.activeSupplyChains.filter((c) => affectedPlayerIds.includes(c.playerId));
  const previousKeys = new Set(previousAffected.map((c) => `${c.playerId}|${c.sourceKey}`));

  const untouched = state.activeSupplyChains.filter((c) => !affectedPlayerIds.includes(c.playerId));
  const recomputed = [];
  for (const playerId of affectedPlayerIds) {
    for (const chain of findSupplyChainsForPlayer(state.board, playerId, config.BOARD_RADIUS)) {
      recomputed.push({ ...chain, playerId });
    }
  }
  state.activeSupplyChains = [...untouched, ...recomputed];

  const newKeys = new Set(recomputed.map((c) => `${c.playerId}|${c.sourceKey}`));
  const newlyCompleted = [...newKeys].filter((k) => !previousKeys.has(k));
  const newlyBroken = [...previousKeys].filter((k) => !newKeys.has(k));

  const dominionEvents = [];
  for (const key of newlyCompleted) {
    const [playerId, sourceKey] = key.split("|");
    const alreadyAwarded = state.completedChainRecords.some(
      (r) => r.playerId === playerId && r.sourceKey === sourceKey
    );
    if (alreadyAwarded) continue;

    const isFirstForPlayer = !state.completedChainRecords.some((r) => r.playerId === playerId);
    const amount = isFirstForPlayer
      ? config.DOMINION_REWARDS.SUPPLY_CHAIN_FIRST
      : config.DOMINION_REWARDS.SUPPLY_CHAIN_SUBSEQUENT;

    state.completedChainRecords.push({ playerId, sourceKey, dominionAwarded: true });
    const player = state.getPlayer(playerId);
    player.dominionPoints += amount;
    player.stats.chainsCompleted += 1;
    dominionEvents.push({ playerId, sourceKey, amount });
  }

  return { newlyCompleted, newlyBroken, dominionEvents };
}

export function processClaim(state, config, playerId, { q, r }) {
  const player = state.getPlayer(playerId);
  const target = state.getCell(q, r);
  const check = validateClaim({ board: state.board, player, target, boardRadius: config.BOARD_RADIUS });
  if (!check.valid) return { success: false, error: check.reason };

  player.actionPoints -= 1;
  target.ownerId = playerId;

  const dominionAwarded =
    target.terrain === TERRAIN.CITY_SITE ? config.DOMINION_REWARDS.CLAIM_CITY_SITE : config.DOMINION_REWARDS.CLAIM_NORMAL;
  player.dominionPoints += dominionAwarded;
  player.stats.territoriesClaimed += 1;

  const chainUpdate = recalcSupplyChains(state, config, [playerId]);
  checkVictory(state, config);

  const event = { action: "claim", playerId, hex: { q, r }, terrain: target.terrain, dominionAwarded, chainUpdate };
  state.pushEvent(event);
  return { success: true, event };
}

export function processBuild(state, config, playerId, { q, r, buildingType }) {
  const player = state.getPlayer(playerId);
  const target = state.getCell(q, r);
  const check = validateBuild({ board: state.board, player, target, buildingType, config, boardRadius: config.BOARD_RADIUS });
  if (!check.valid) return { success: false, error: check.reason };

  spend(player, config.BUILD_COSTS[buildingType]);
  player.actionPoints -= 1;
  target.building = buildingType;
  player.stats.buildingsBuilt += 1;

  let dominionAwarded = 0;
  if (buildingType === BUILDING.CITY) {
    dominionAwarded = config.DOMINION_REWARDS.BUILD_CITY;
    player.dominionPoints += dominionAwarded;
  }

  const chainUpdate = recalcSupplyChains(state, config, [playerId]);
  checkVictory(state, config);

  const event = { action: "build", playerId, hex: { q, r }, buildingType, dominionAwarded, chainUpdate };
  state.pushEvent(event);
  return { success: true, event };
}

export function processAttack(state, config, attackerId, { q, r }) {
  const attacker = state.getPlayer(attackerId);
  const target = state.getCell(q, r);
  const check = validateAttack({ board: state.board, attacker, target, config, boardRadius: config.BOARD_RADIUS });
  if (!check.valid) return { success: false, error: check.reason };

  const defenderId = target.ownerId;
  const defender = state.getPlayer(defenderId);

  spend(attacker, config.ATTACK_COSTS);
  attacker.actionPoints -= 1;
  attacker.stats.attacksLaunched += 1;

  const hasActiveSupplyChain = state.activeSupplyChains.some((c) => c.playerId === attackerId && c.active);
  const attackResult = calculateAttackStrength({
    board: state.board,
    targetHex: target,
    attackerId,
    hasActiveSupplyChain,
    config,
    boardRadius: config.BOARD_RADIUS,
  });
  const defenseResult = calculateDefenseStrength({ targetHex: target, config });
  const outcome = resolveAttack(attackResult.total, defenseResult.total);

  let dominionAwarded = 0;
  const wasEnemyCity = target.building === BUILDING.CITY;
  const wasCitySite = target.terrain === TERRAIN.CITY_SITE;

  if (outcome === "SUCCESS") {
    target.ownerId = attackerId;
    target.building = null;
    target.fortificationLevel = 0;

    dominionAwarded = wasEnemyCity
      ? config.DOMINION_REWARDS.CAPTURE_ENEMY_CITY
      : wasCitySite
      ? config.DOMINION_REWARDS.CAPTURE_CITY_SITE
      : config.DOMINION_REWARDS.CAPTURE_NORMAL;
    attacker.dominionPoints += dominionAwarded;
    attacker.stats.attacksSucceeded += 1;
  } else {
    attacker.stats.attacksFailed += 1;
  }

  const affected = outcome === "SUCCESS" ? [attackerId, defenderId] : [attackerId];
  const chainUpdate = recalcSupplyChains(state, config, affected);
  checkVictory(state, config);

  const event = {
    action: "attack",
    playerId: attackerId,
    defenderId,
    hex: { q, r },
    attackStrength: attackResult,
    defenseStrength: defenseResult,
    outcome,
    dominionAwarded,
    chainUpdate,
  };
  state.pushEvent(event);
  return { success: true, event };
}

export function processFortify(state, config, playerId, { q, r }) {
  const player = state.getPlayer(playerId);
  const target = state.getCell(q, r);
  const check = validateFortify({ player, target, config });
  if (!check.valid) return { success: false, error: check.reason };

  spend(player, config.FORTIFY_COSTS);
  player.actionPoints -= 1;
  target.fortificationLevel += 1;

  const event = { action: "fortify", playerId, hex: { q, r }, newLevel: target.fortificationLevel };
  state.pushEvent(event);
  return { success: true, event };
}
