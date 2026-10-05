import { getModeConfig } from "../config.js";

// The match's effective rules. The server sends them with every state (they vary with player
// count); the config fallback only matters before the first state arrives.
export function rulesOf(gameState) {
  const r = gameState?.rules;
  if (r) return r;
  const cfg = getModeConfig(gameState?.mode, gameState?.players?.length);
  return {
    victoryScore: cfg.VICTORY_SCORE,
    maxRounds: cfg.MAX_ROUNDS ?? null,
    turnSeconds: cfg.TURN_DURATION_SECONDS,
    actionPoints: cfg.ACTION_POINTS_PER_TURN,
    chainPerRound: cfg.DOMINION_REWARDS.SUPPLY_CHAIN_PER_ROUND || 0,
  };
}
