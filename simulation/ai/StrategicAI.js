import { ACTION_TYPE, BUILDING } from "../../shared/constants.js";
import { hexKey } from "../../shared/hexMath.js";
import { generateLegalActions, applyAction, cloneState, describeAction } from "./actions.js";
import { resourceTotal, estimateIncome, chainPotential, enemyNeighborCount, expansionValue, isOnChainPath } from "./features.js";

// Used when gameConfig.json omits a weight (spec.md §49: all weights are
// configurable). `victory` and `denyLeader` cover the top two entries of the
// spec.md §50 priority order.
export const DEFAULT_WEIGHTS = {
  victory: 1000,
  dominionGain: 3,
  resourceGain: 1,
  chainCompletion: 5,
  chainDisruption: 4,
  defensiveValue: 2,
  threatProximity: 1,
  expansionValue: 1,
  denyLeader: 3,
  captureSwing: 2,
  resourceCost: -0.25,
};

// Explainable one-ply heuristic (spec.md §47-52). Each legal action is applied
// to a cloned state through the real ActionProcessor, measured into named
// features, and scored as sum(weight * feature). The explanation returned is
// that exact table — nothing is reconstructed after the fact.
export class StrategicAI {
  constructor({ weights } = {}) {
    this.name = "strategic";
    this.overrideWeights = weights;
  }

  getWeights(config) {
    return { ...DEFAULT_WEIGHTS, ...(config.AI_WEIGHTS || {}), ...(this.overrideWeights || {}) };
  }

  chooseAction(state, config, playerId) {
    const weights = this.getWeights(config);
    const actions = generateLegalActions(state, config, playerId);

    const scored = [];
    for (const action of actions) {
      const evaluation = this.evaluate(state, config, playerId, action, weights);
      if (evaluation) scored.push(evaluation);
    }
    scored.sort((a, b) => b.total - a.total);

    const best = scored[0];
    if (!best || best.total <= 0) {
      return {
        action: null,
        explanation: { summary: "End turn: no action scored above 0", total: 0, features: [], alternatives: scored.slice(0, 3).map(brief) },
      };
    }
    return {
      action: best.action,
      explanation: {
        summary: describeAction(best.action),
        total: best.total,
        features: best.features,
        alternatives: scored.slice(1, 4).map(brief),
      },
    };
  }

  evaluate(state, config, playerId, action, weights) {
    const trial = cloneState(state);
    const before = state.getPlayer(playerId);
    const result = applyAction(trial, config, playerId, action);
    if (!result.success) return null;

    const after = trial.getPlayer(playerId);
    const event = result.event;
    const chainUpdate = event.chainUpdate || { newlyCompleted: [], newlyBroken: [] };
    const cell = trial.getCell(action.q, action.r);
    const boardRadius = config.BOARD_RADIUS;
    const key = hexKey(action.q, action.r);

    const raw = {
      victory: trial.winnerId === playerId ? 1 : 0,
      dominionGain: after.dominionPoints - before.dominionPoints,
      resourceGain: estimateIncome(trial, config, playerId) - estimateIncome(state, config, playerId),
      chainCompletion: chainUpdate.newlyCompleted.filter((k) => k.startsWith(`${playerId}|`)).length * 1 + chainPotential(trial, cell, playerId),
      chainDisruption: chainUpdate.newlyBroken.filter((k) => !k.startsWith(`${playerId}|`)).length,
      defensiveValue: 0,
      threatProximity: 0,
      expansionValue: 0,
      denyLeader: 0,
      captureSwing: 0,
      resourceCost: resourceTotal(before) - resourceTotal(after),
    };

    if (action.type === ACTION_TYPE.CLAIM) {
      raw.expansionValue = expansionValue(trial, cell, boardRadius);
    }
    if (action.type === ACTION_TYPE.FORTIFY || (action.type === ACTION_TYPE.BUILD && action.buildingType === BUILDING.FORTRESS)) {
      raw.threatProximity = enemyNeighborCount(trial, cell, playerId, boardRadius);
      raw.defensiveValue = (isOnChainPath(state, playerId, key) ? 2 : 0) + (cell.building === BUILDING.CITY ? 1 : 0) + (raw.threatProximity > 0 ? 1 : 0);
      // Defending a hex nobody can reach this round is worth nothing.
      if (raw.threatProximity === 0) raw.defensiveValue = 0;
    }
    if (action.type === ACTION_TYPE.ATTACK && event.outcome === "SUCCESS") {
      const defender = state.getPlayer(event.defenderId);
      raw.captureSwing = 1;
      if (defender.dominionPoints >= config.VICTORY_SCORE * 0.7) raw.denyLeader = 1;
    }

    const features = Object.keys(raw).map((name) => ({
      name,
      value: raw[name],
      weight: weights[name] ?? 0,
      contribution: raw[name] * (weights[name] ?? 0),
    }));
    const total = features.reduce((sum, f) => sum + f.contribution, 0);
    return { action, total, features: features.filter((f) => f.value !== 0) };
  }
}

function brief(entry) {
  return { action: entry.action, label: describeAction(entry.action), total: entry.total };
}
