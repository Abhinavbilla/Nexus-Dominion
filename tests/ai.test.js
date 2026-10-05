import { describe, it, expect } from "vitest";
import { runMatch, loadBaseConfig } from "../simulation/Simulator.js";
import { generateLegalActions, applyAction, cloneState } from "../simulation/ai/actions.js";
import { StrategicAI } from "../simulation/ai/StrategicAI.js";
import { createMatch, startMatch } from "../server/GameEngine.js";
import { resolveModeConfig } from "../shared/gameConfig.js";

const baseConfig = loadBaseConfig();

function freshMatch(seed = 7, n = 2) {
  const config = resolveModeConfig(baseConfig, "normal");
  const playersInput = Array.from({ length: n }, (_, i) => ({ id: `p${i + 1}`, name: `P${i + 1}`, socketId: null, reconnectToken: null }));
  const state = createMatch({ matchId: "t", mode: "normal", playersInput, initialSeed: seed, config });
  startMatch(state, config);
  return { state, config };
}

describe("legal actions", () => {
  it("every generated action is accepted by the ActionProcessor", () => {
    const { state, config } = freshMatch();
    const actions = generateLegalActions(state, config, "p1");
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(applyAction(cloneState(state), config, "p1", action).success).toBe(true);
    }
  });

  it("returns nothing when the player has no Action Points", () => {
    const { state, config } = freshMatch();
    state.getPlayer("p1").actionPoints = 0;
    expect(generateLegalActions(state, config, "p1")).toEqual([]);
  });
});

describe("StrategicAI", () => {
  it("explanation total equals the sum of its feature contributions", () => {
    const { state, config } = freshMatch();
    const { action, explanation } = new StrategicAI().chooseAction(state, config, "p1");
    expect(action).not.toBeNull();
    const sum = explanation.features.reduce((s, f) => s + f.contribution, 0);
    expect(sum).toBeCloseTo(explanation.total);
  });

  it("does not mutate the real state while evaluating", () => {
    const { state, config } = freshMatch();
    const before = JSON.stringify(state.toWireFormat().board) + JSON.stringify(state.players);
    new StrategicAI().chooseAction(state, config, "p1");
    expect(JSON.stringify(state.toWireFormat().board) + JSON.stringify(state.players)).toBe(before);
  });
});

describe("headless matches", () => {
  it("are deterministic for a given seed", () => {
    const a = runMatch({ seed: 123, aiTypes: ["strategic", "random"], baseConfig });
    const b = runMatch({ seed: 123, aiTypes: ["strategic", "random"], baseConfig });
    const strip = (r) => ({ ...r, players: r.players.map(({ avgDecisionMs, ...rest }) => rest) });
    expect(strip(a)).toEqual(strip(b));
  });

  it("every AI type finishes a match without choosing an illegal action", () => {
    for (const types of [["random", "random"], ["greedy", "greedy"], ["strategic", "strategic", "greedy", "random"]]) {
      const result = runMatch({ seed: 42, aiTypes: types, baseConfig });
      expect(result.finished).toBe(true);
    }
  });
});
