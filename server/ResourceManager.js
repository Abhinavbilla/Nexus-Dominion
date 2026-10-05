import { BUILDING, RESOURCE_TERRAIN, TERRAIN } from "@hex-dominion/shared/constants.js";
import { findAllActiveSupplyChains } from "@hex-dominion/shared/supplyChain.js";

// Round-start Dominion income: each active Supply Chain keeps paying while it stays
// connected. This gives long matches steady progress and makes protecting (or cutting)
// a chain matter all game, not just when it is first completed.
export function awardChainDominion(state, config) {
  const per = config.DOMINION_REWARDS.SUPPLY_CHAIN_PER_ROUND || 0;
  const awarded = [];
  if (!per) return awarded;
  for (const player of state.players) {
    const chains = state.activeSupplyChains.filter((c) => c.playerId === player.id && c.active).length;
    if (!chains) continue;
    const amount = chains * per;
    player.dominionPoints += amount;
    awarded.push({ playerId: player.id, amount, chains });
    state.pushEvent({ type: "chain_income", playerId: player.id, amount, chains });
  }
  return awarded;
}

// Round-start resource generation (spec.md §11-12, §24, §36). Supply Chain
// resource bonuses are only ever paid here, never mid-turn (decisions.md #12).
export function generateRoundResources(state, config) {
  const boardRadius = config.BOARD_RADIUS;
  const playerIds = state.players.map((p) => p.id);

  // "Confirm Supply Chain state from the current board" (spec.md §36 step 1).
  state.activeSupplyChains = findAllActiveSupplyChains(state.board, playerIds, boardRadius);

  const gainsByPlayer = {};
  for (const player of state.players) {
    const gains = { wood: 0, metal: 0, energy: 0 };

    for (const cell of state.board.values()) {
      if (cell.ownerId !== player.id) continue;

      const resource = RESOURCE_TERRAIN[cell.terrain];
      if (resource) {
        gains[resource] += config.RESOURCE_GENERATION[cell.terrain][resource];
        if (cell.building === BUILDING.FACTORY) {
          gains[resource] += config.RESOURCE_GENERATION.factory_bonus;
        }
      } else if (cell.terrain === TERRAIN.PLAINS && cell.building === BUILDING.FACTORY) {
        gains.energy += config.RESOURCE_GENERATION.factory_on_plains_energy;
      }
    }

    for (const chain of state.activeSupplyChains) {
      if (chain.playerId !== player.id) continue;
      gains[chain.resourceType] += config.RESOURCE_GENERATION.supply_chain_bonus;
    }

    player.resources.wood += gains.wood;
    player.resources.metal += gains.metal;
    player.resources.energy += gains.energy;
    player.stats.resourcesCollected += gains.wood + gains.metal + gains.energy;

    gainsByPlayer[player.id] = gains;
  }

  return gainsByPlayer;
}
