import { ACTION_TYPE, BUILDING } from "../../shared/constants.js";
import { validateClaim, validateBuild, validateAttack, validateFortify } from "../../shared/validation.js";
import { GameState } from "../../server/GameState.js";
import { processClaim, processBuild, processAttack, processFortify } from "../../server/ActionProcessor.js";

// Legal action generation (spec.md §48 step 1). Every candidate is checked
// with the same shared validators the server uses, so the AI can never
// propose an action the ActionProcessor would reject. Output order is
// deterministic (board insertion order, fixed action/building order).
const BUILDING_ORDER = [BUILDING.FACTORY, BUILDING.CITY, BUILDING.FORTRESS];

export function generateLegalActions(state, config, playerId) {
  const player = state.getPlayer(playerId);
  const boardRadius = config.BOARD_RADIUS;
  const actions = [];
  if (player.actionPoints < 1) return actions;

  for (const cell of state.board.values()) {
    const { q, r } = cell;
    if (validateClaim({ board: state.board, player, target: cell, boardRadius }).valid) {
      actions.push({ type: ACTION_TYPE.CLAIM, q, r });
    }
    if (validateAttack({ board: state.board, attacker: player, target: cell, config, boardRadius }).valid) {
      actions.push({ type: ACTION_TYPE.ATTACK, q, r });
    }
    if (cell.ownerId !== playerId) continue;
    for (const buildingType of BUILDING_ORDER) {
      if (validateBuild({ board: state.board, player, target: cell, buildingType, config, boardRadius }).valid) {
        actions.push({ type: ACTION_TYPE.BUILD, q, r, buildingType });
      }
    }
    if (validateFortify({ player, target: cell, config }).valid) {
      actions.push({ type: ACTION_TYPE.FORTIFY, q, r });
    }
  }
  return actions;
}

// Applies a legal action through the authoritative ActionProcessor.
export function applyAction(state, config, playerId, action) {
  switch (action.type) {
    case ACTION_TYPE.CLAIM:
      return processClaim(state, config, playerId, action);
    case ACTION_TYPE.BUILD:
      return processBuild(state, config, playerId, action);
    case ACTION_TYPE.ATTACK:
      return processAttack(state, config, playerId, action);
    case ACTION_TYPE.FORTIFY:
      return processFortify(state, config, playerId, action);
    default:
      return { success: false, error: `Unknown action type "${action.type}"` };
  }
}

// Deep copy of mutable match state so the AI can look one action ahead
// without touching the real match.
export function cloneState(state) {
  const board = new Map();
  for (const [key, cell] of state.board) board.set(key, { ...cell });
  const copy = new GameState({
    matchId: state.matchId,
    initialSeed: state.initialSeed,
    boardSeed: state.boardSeed,
    mode: state.mode,
    cells: board,
    players: state.players.map((p) => ({ ...p, resources: { ...p.resources }, stats: { ...p.stats } })),
  });
  copy.status = state.status;
  copy.currentRound = state.currentRound;
  copy.currentPlayerIndex = state.currentPlayerIndex;
  copy.startingPlayerOffset = state.startingPlayerOffset;
  copy.turnTimeRemaining = state.turnTimeRemaining;
  copy.activeSupplyChains = state.activeSupplyChains.map((c) => ({ ...c }));
  copy.completedChainRecords = state.completedChainRecords.map((r) => ({ ...r }));
  copy.rules = state.rules;
  copy.thresholdReached = state.thresholdReached;
  copy.winnerId = state.winnerId;
  copy.winReason = state.winReason;
  return copy;
}

export function describeAction(action) {
  const where = `(${action.q},${action.r})`;
  switch (action.type) {
    case ACTION_TYPE.CLAIM:
      return `Claim ${where}`;
    case ACTION_TYPE.BUILD:
      return `Build ${action.buildingType} at ${where}`;
    case ACTION_TYPE.ATTACK:
      return `Attack ${where}`;
    case ACTION_TYPE.FORTIFY:
      return `Fortify ${where}`;
    default:
      return "End turn";
  }
}
