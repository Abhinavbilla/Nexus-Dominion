import { hexKey } from "@hex-dominion/shared/hexMath.js";
import { MATCH_STATUS } from "@hex-dominion/shared/constants.js";

// Authoritative server-side state container (spec.md §76). Internally the
// board is a Map<string, HexCell> for O(1) lookups; toWireFormat() converts
// it to the canonical JSON array format for every Socket.IO broadcast
// (spec.md §76.1). Nothing here is ever sent to clients un-serialized.

export class GameState {
  constructor({ matchId, initialSeed, boardSeed, mode, cells, players }) {
    this.matchId = matchId;
    this.initialSeed = initialSeed;
    this.boardSeed = boardSeed;
    this.mode = mode;
    this.status = MATCH_STATUS.LOBBY;
    this.currentRound = 1;
    this.currentPlayerIndex = 0;
    this.turnTimeRemaining = 0;
    this.startingPlayerOffset = 0;
    this.players = players; // array of player objects, index-aligned with turn order
    this.board = cells; // Map<"q,r", HexCell>
    this.activeSupplyChains = []; // [{ playerId, sourceKey, cityKey, resourceType, pathKeys, active }]
    this.completedChainRecords = []; // [{ playerId, sourceKey, dominionAwarded }]
    this.rules = null; // { victoryScore, maxRounds, turnSeconds, actionPoints, chainPerRound } shown to clients
    this.thresholdReached = false; // VICTORY_AT_ROUND_END: someone hit the score; decided when the round ends
    this.winnerId = null;
    this.winReason = null;
    this.eventLog = []; // most-recent-last; client trims for display
  }

  getCell(q, r) {
    return this.board.get(hexKey(q, r));
  }

  getPlayer(playerId) {
    return this.players.find((p) => p.id === playerId);
  }

  getCurrentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  pushEvent(event) {
    this.eventLog.push({ ...event, round: this.currentRound, timestamp: Date.now() });
    if (this.eventLog.length > 200) this.eventLog.shift();
  }

  // Canonical JSON wire format (spec.md §76.1). Strips server-only secrets
  // (reconnectToken, socketId) from each player before broadcasting.
  toWireFormat() {
    return {
      matchId: this.matchId,
      initialSeed: this.initialSeed,
      boardSeed: this.boardSeed,
      status: this.status,
      currentRound: this.currentRound,
      currentPlayerIndex: this.currentPlayerIndex,
      turnTimeRemaining: this.turnTimeRemaining,
      startingPlayerOffset: this.startingPlayerOffset,
      players: this.players.map(serializePlayer),
      board: [...this.board.values()].map((cell) => ({
        q: cell.q,
        r: cell.r,
        terrain: cell.terrain,
        ownerId: cell.ownerId,
        building: cell.building,
        fortificationLevel: cell.fortificationLevel,
      })),
      activeSupplyChains: this.activeSupplyChains,
      completedChainRecords: this.completedChainRecords,
      rules: this.rules,
      thresholdReached: this.thresholdReached,
      winnerId: this.winnerId,
      winReason: this.winReason,
      eventLog: this.eventLog,
    };
  }
}

function serializePlayer(player) {
  const { reconnectToken, socketId, ...publicFields } = player;
  return publicFields;
}
