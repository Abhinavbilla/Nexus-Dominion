import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateGameConfig, resolveModeConfig } from "../shared/gameConfig.js";
import { mulberry32 } from "../shared/boardGenerator.js";
import { BUILDING } from "../shared/constants.js";
import { createMatch, startMatch, endTurn } from "../server/GameEngine.js";
import { applyAction } from "./ai/actions.js";
import { RandomAI } from "./ai/RandomAI.js";
import { GreedyAI } from "./ai/GreedyAI.js";
import { StrategicAI } from "./ai/StrategicAI.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

export function loadBaseConfig() {
  const raw = JSON.parse(readFileSync(resolve(__dirname, "../gameConfig.json"), "utf-8"));
  return validateGameConfig(raw);
}

export function createAI(type, rng) {
  switch (type) {
    case "random":
      return new RandomAI({ rng });
    case "greedy":
      return new GreedyAI({ rng });
    case "strategic":
      return new StrategicAI({ rng });
    default:
      throw new Error(`Unknown AI type "${type}"`);
  }
}

function countTerritory(state, playerId) {
  let n = 0;
  for (const cell of state.board.values()) if (cell.ownerId === playerId) n++;
  return n;
}

// Plays one complete headless match. `aiTypes[i]` controls player i.
// Fully deterministic for a given (seed, aiTypes, mode): the board comes from
// `seed` and the Random AI draws from a mulberry32 stream derived from it.
export function runMatch({ seed, aiTypes, mode = "normal", baseConfig = loadBaseConfig(), maxActions = 5000 }) {
  const config = resolveModeConfig(baseConfig, mode, aiTypes.length);
  const rng = mulberry32((seed ^ 0x9e3779b9) >>> 0);
  const playersInput = aiTypes.map((type, i) => ({
    id: `p${i + 1}`,
    name: `${type}-${i + 1}`,
    socketId: null,
    reconnectToken: null,
  }));
  const ais = aiTypes.map((type) => createAI(type, rng));
  const decisionMs = aiTypes.map(() => ({ total: 0, count: 0 }));

  const state = createMatch({ matchId: `sim-${seed}`, mode, playersInput, initialSeed: seed, config });
  startMatch(state, config);

  let actions = 0;
  while (state.status === "playing" && actions < maxActions) {
    const index = state.currentPlayerIndex;
    const player = state.getCurrentPlayer();
    const t0 = performance.now();
    const { action } = ais[index].chooseAction(state, config, player.id);
    decisionMs[index].total += performance.now() - t0;
    decisionMs[index].count += 1;

    if (!action) {
      endTurn(state, config, "manual");
    } else {
      const result = applyAction(state, config, player.id, action);
      if (!result.success) throw new Error(`${ais[index].name} chose illegal action: ${result.error}`);
      if (state.status === "playing" && player.actionPoints < 1) endTurn(state, config, "ap_exhausted");
    }
    actions++;
  }

  return {
    seed,
    aiTypes,
    finished: state.status === "finished",
    winnerId: state.winnerId,
    winnerIndex: state.winnerId ? state.players.findIndex((p) => p.id === state.winnerId) : null,
    winReason: state.winReason,
    rounds: state.currentRound,
    players: state.players.map((p, i) => ({
      ai: aiTypes[i],
      dominionPoints: p.dominionPoints,
      territory: countTerritory(state, p.id),
      cities: [...state.board.values()].filter((c) => c.ownerId === p.id && c.building === BUILDING.CITY).length,
      stats: p.stats,
      avgDecisionMs: decisionMs[i].count ? decisionMs[i].total / decisionMs[i].count : 0,
    })),
  };
}
