import { endTurn } from "./GameEngine.js";
import { applyAction } from "../simulation/ai/actions.js";
import { createAI } from "../simulation/Simulator.js";

const THINK_DELAY_MS = 900;

// Drives AI seats during live matches (spec.md §47-52). After every state
// change the server calls `maybeRun(room)`; if the current player is an AI,
// it plays its Action Points one action at a time with a short delay so
// humans can follow, emitting the real heuristic breakdown for each move as
// "ai_explanation". All actions go through the same ActionProcessor as human
// moves, so legality is guaranteed.
export function createAIController({ io, broadcastStateUpdate, stopTurnTimer }) {
  const running = new Set();
  const brains = new Map(); // `${roomCode}:${playerId}` -> AI instance

  function brainFor(room, player) {
    const key = `${room.code}:${player.id}`;
    if (!brains.has(key)) brains.set(key, createAI(player.aiType, Math.random));
    return brains.get(key);
  }

  function step(room) {
    const state = room.state;
    if (!state || state.status !== "playing") return running.delete(room.code);
    const player = state.getCurrentPlayer();
    if (player.left) {
      // A player who left the match: skip their turn immediately.
      const result = endTurn(state, room.config, "left");
      broadcastStateUpdate(room, { action: "end_turn", reason: "left", playerId: player.id });
      if (result.matchFinished) stopTurnTimer(room);
      setTimeout(() => step(room), 250);
      return;
    }
    if (!player.isAI) return running.delete(room.code);

    const { action, explanation } = brainFor(room, player).chooseAction(state, room.config, player.id);

    if (!action) {
      const result = endTurn(state, room.config, "ai_done");
      broadcastStateUpdate(room, { action: "end_turn", reason: "ai_done", playerId: player.id });
      if (result.matchFinished) stopTurnTimer(room);
    } else {
      const result = applyAction(state, room.config, player.id, action);
      if (!result.success) {
        // Should be unreachable; fail safe by ending the turn.
        endTurn(state, room.config, "ai_error");
        broadcastStateUpdate(room, { action: "end_turn", reason: "ai_error", playerId: player.id });
      } else {
        let matchFinished = state.status !== "playing";
        if (!matchFinished && player.actionPoints < 1) {
          matchFinished = endTurn(state, room.config, "no_ap").matchFinished;
        }
        io.to(room.code).emit("ai_explanation", {
          playerId: player.id,
          round: state.currentRound,
          action,
          explanation,
        });
        broadcastStateUpdate(room, result.event);
        if (matchFinished) stopTurnTimer(room);
      }
    }
    setTimeout(() => step(room), THINK_DELAY_MS);
  }

  return {
    maybeRun(room) {
      const state = room.state;
      if (!state || state.status !== "playing") return;
      const current = state.getCurrentPlayer();
      if (!current.isAI && !current.left) return;
      if (running.has(room.code)) return;
      running.add(room.code);
      setTimeout(() => step(room), THINK_DELAY_MS);
    },
  };
}
