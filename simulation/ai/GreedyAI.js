import { generateLegalActions, applyAction, cloneState } from "./actions.js";
import { resourceTotal } from "./features.js";

// Resource gain only breaks ties between equal Dominion gains.
const RESOURCE_TIEBREAK_WEIGHT = 0.001;

// Baseline: maximizes immediate Dominion gain, then immediate resource gain
// (spec.md §53). Ties resolve to the first action in deterministic order.
export class GreedyAI {
  constructor({ rng = Math.random } = {}) {
    this.name = "greedy";
    this.rng = rng;
  }

  chooseAction(state, config, playerId) {
    const actions = generateLegalActions(state, config, playerId);
    if (actions.length === 0) return { action: null, explanation: { summary: "No legal actions", total: 0 } };

    const before = state.getPlayer(playerId);
    let best = null;
    let ties = 1;
    for (const action of actions) {
      const trial = cloneState(state);
      if (!applyAction(trial, config, playerId, action).success) continue;
      const after = trial.getPlayer(playerId);
      const dominionGain = after.dominionPoints - before.dominionPoints;
      const resourceGain = resourceTotal(after) - resourceTotal(before);
      const score = dominionGain + resourceGain * RESOURCE_TIEBREAK_WEIGHT;
      if (!best || score > best.score) {
        best = { action, score, dominionGain, resourceGain };
        ties = 1;
      } else if (score === best.score && this.rng() < 1 / ++ties) {
        best = { action, score, dominionGain, resourceGain }; // reservoir sampling over equal scores
      }
    }
    if (!best || best.score <= 0) return { action: null, explanation: { summary: "No legal actions", total: 0 } };

    return {
      action: best.action,
      explanation: {
        summary: "Highest immediate Dominion/resource gain",
        total: best.score,
        features: [
          { name: "dominionGain", value: best.dominionGain, weight: 1, contribution: best.dominionGain },
          { name: "resourceGain", value: best.resourceGain, weight: RESOURCE_TIEBREAK_WEIGHT, contribution: best.resourceGain * RESOURCE_TIEBREAK_WEIGHT },
        ],
      },
    };
  }
}
