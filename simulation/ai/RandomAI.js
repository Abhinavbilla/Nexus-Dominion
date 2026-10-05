import { generateLegalActions } from "./actions.js";

// Baseline: picks uniformly among legal actions (spec.md §53). `rng` is a
// seeded () => [0,1) function so benchmark runs are reproducible.
export class RandomAI {
  constructor({ rng = Math.random } = {}) {
    this.name = "random";
    this.rng = rng;
  }

  chooseAction(state, config, playerId) {
    const actions = generateLegalActions(state, config, playerId);
    if (actions.length === 0) return { action: null, explanation: { summary: "No legal actions", total: 0 } };
    const action = actions[Math.floor(this.rng() * actions.length)];
    return { action, explanation: { summary: "Random legal action", total: 0, features: [] } };
  }
}
