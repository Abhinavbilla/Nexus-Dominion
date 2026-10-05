// Turn/round rotation (spec.md §35-37). Turn order within a round is the
// player array rotated by `startingPlayerOffset`; the offset advances by one
// every round so first-move advantage rotates (P1P2P3P4 -> P2P3P4P1 -> ...).

export function startTurn(state, config) {
  const player = state.getCurrentPlayer();
  player.actionPoints = config.ACTION_POINTS_PER_TURN;
  state.turnTimeRemaining = config.TURN_DURATION_SECONDS;
  state.pushEvent({ type: "turn_started", playerId: player.id });
}

// Advances to the next player's turn. If the round is complete (every player
// has taken a turn), rotates startingPlayerOffset and reports roundEnded so
// the caller (GameEngine) can run round-start logic before starting the turn.
export function advanceTurn(state, config) {
  const n = state.players.length;
  const position = (state.currentPlayerIndex - state.startingPlayerOffset + n) % n;

  if (position + 1 < n) {
    state.currentPlayerIndex = (state.startingPlayerOffset + position + 1) % n;
    startTurn(state, config);
    return { roundEnded: false };
  }

  state.currentRound += 1;
  state.startingPlayerOffset = (state.startingPlayerOffset + 1) % n;
  state.currentPlayerIndex = state.startingPlayerOffset;
  return { roundEnded: true };
}
