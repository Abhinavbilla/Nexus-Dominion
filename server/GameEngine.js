import { generateBoard } from "@hex-dominion/shared/boardGenerator.js";
import { BUILDING } from "@hex-dominion/shared/constants.js";
import { GameState } from "./GameState.js";
import { startTurn, advanceTurn } from "./TurnManager.js";
import { generateRoundResources } from "./ResourceManager.js";

function createEmptyStats() {
  return {
    territoriesClaimed: 0,
    buildingsBuilt: 0,
    attacksLaunched: 0,
    attacksSucceeded: 0,
    attacksFailed: 0,
    chainsCompleted: 0,
    resourcesCollected: 0,
    resourcesSpent: 0,
  };
}

// Builds a fresh authoritative match (spec.md §6-7, §13, §21). `playersInput`
// is index-aligned with config.STARTING_POSITIONS / config.PLAYER_COLORS —
// join order determines starting corner and color.
export function createMatch({ matchId, mode, playersInput, initialSeed, config }) {
  const { boardSeed, cells } = generateBoard(initialSeed, config);

  const players = playersInput.map((input, i) => {
    const startPos = config.STARTING_POSITIONS[i];
    const startCell = cells.get(`${startPos.q},${startPos.r}`);
    startCell.ownerId = input.id;
    startCell.building = BUILDING.COMMAND_HUB;

    return {
      id: input.id,
      name: input.name,
      color: config.PLAYER_COLORS[i],
      socketId: input.socketId,
      reconnectToken: input.reconnectToken,
      connected: true,
      isAI: Boolean(input.isAI),
      aiType: input.aiType || null,
      resources: { ...config.STARTING_RESOURCES },
      dominionPoints: 0,
      actionPoints: 0,
      stats: createEmptyStats(),
    };
  });

  return new GameState({ matchId, initialSeed, boardSeed, mode, cells, players });
}

export function startMatch(state, config) {
  state.status = "playing";
  generateRoundResources(state, config);
  startTurn(state, config);
  state.pushEvent({ type: "match_started" });
}

function getTerritoryCount(state, playerId) {
  let count = 0;
  for (const cell of state.board.values()) if (cell.ownerId === playerId) count++;
  return count;
}

function getCityCount(state, playerId) {
  let count = 0;
  for (const cell of state.board.values()) {
    if (cell.ownerId === playerId && cell.building === BUILDING.CITY) count++;
  }
  return count;
}

function getResourceTotal(player) {
  return player.resources.wood + player.resources.metal + player.resources.energy;
}

// Round-limit victory + tie-breakers (spec.md §38-39).
function finishByRoundLimit(state, config) {
  const scored = state.players.map((player) => ({
    player,
    dominion: player.dominionPoints,
    territory: getTerritoryCount(state, player.id),
    cities: getCityCount(state, player.id),
    resources: getResourceTotal(player),
  }));
  scored.sort(
    (a, b) => b.dominion - a.dominion || b.territory - a.territory || b.cities - a.cities || b.resources - a.resources
  );
  const top = scored[0];
  const tied = scored.filter(
    (s) => s.dominion === top.dominion && s.territory === top.territory && s.cities === top.cities && s.resources === top.resources
  );

  state.status = "finished";
  if (tied.length > 1) {
    state.winnerId = null;
    state.winReason = "draw";
  } else {
    state.winnerId = top.player.id;
    state.winReason = "round_limit";
  }
  state.pushEvent({ type: "game_over", winnerId: state.winnerId, reason: state.winReason });
}

// Ends the current player's turn (manual, AP exhaustion, or timer timeout)
// and advances round state. Returns whether the round ended and whether the
// match finished so the caller (RoomManager) can manage the turn timer.
export function endTurn(state, config, reason = "manual") {
  if (state.status !== "playing") return { roundEnded: false, matchFinished: true };

  state.pushEvent({ type: "turn_ended", playerId: state.getCurrentPlayer().id, reason });
  const { roundEnded } = advanceTurn(state, config);

  if (!roundEnded) {
    return { roundEnded: false, matchFinished: false };
  }

  if (state.currentRound > config.MAX_ROUNDS) {
    finishByRoundLimit(state, config);
    return { roundEnded: true, matchFinished: true };
  }

  generateRoundResources(state, config);
  startTurn(state, config);
  state.pushEvent({ type: "round_started", round: state.currentRound });
  return { roundEnded: true, matchFinished: false };
}
