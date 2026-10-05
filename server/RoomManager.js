import { randomUUID } from "node:crypto";
import { resolveModeConfig } from "@hex-dominion/shared/gameConfig.js";
import { createMatch, startMatch } from "./GameEngine.js";

const AI_TYPES = ["random", "greedy", "strategic"];
const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity

// Room lifecycle (spec.md §45-46): create/join/leave/reconnect, room codes,
// max 4 players, no accounts. Socket.IO wiring lives in index.js; this class
// is transport-agnostic so it can be unit-tested directly.
export class RoomManager {
  constructor(baseConfig) {
    this.baseConfig = baseConfig;
    this.rooms = new Map();
  }

  createRoom({ hostName, socketId }) {
    const code = this._generateRoomCode();
    const playerId = randomUUID();
    const reconnectToken = randomUUID();
    const room = {
      code,
      hostPlayerId: playerId,
      lobbyPlayers: [{ id: playerId, name: hostName, socketId, reconnectToken, connected: true }],
      state: null,
      config: null,
    };
    this.rooms.set(code, room);
    return { room, playerId, reconnectToken };
  }

  joinRoom({ roomCode, playerName, socketId }) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: "Room not found" };
    if (room.state) return { error: "Game already started" };
    if (room.lobbyPlayers.length >= this.baseConfig.STARTING_POSITIONS.length) {
      return { error: "Room is full" };
    }
    const playerId = randomUUID();
    const reconnectToken = randomUUID();
    room.lobbyPlayers.push({ id: playerId, name: playerName, socketId, reconnectToken, connected: true });
    return { room, playerId, reconnectToken };
  }

  // AI opponents occupy ordinary lobby seats (spec.md §47); they have no
  // socket or reconnect token and are driven by server/AIController.js.
  addAI({ roomCode, requestingPlayerId, aiType }) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: "Room not found" };
    if (room.state) return { error: "Game already started" };
    if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can add AI players" };
    if (!AI_TYPES.includes(aiType)) return { error: "Unknown AI type" };
    if (room.lobbyPlayers.length >= this.baseConfig.STARTING_POSITIONS.length) return { error: "Room is full" };

    const aiCount = room.lobbyPlayers.filter((p) => p.isAI).length + 1;
    room.lobbyPlayers.push({
      id: randomUUID(),
      name: `NEXUS-AI ${aiCount} (${aiType})`,
      socketId: null,
      reconnectToken: null,
      connected: true,
      isAI: true,
      aiType,
    });
    return { room };
  }

  // Host-only: remove any other player (human or AI) from the lobby. Humans are not banned —
  // they can rejoin with the room code.
  removePlayer({ roomCode, requestingPlayerId, targetId }) {
    const room = this.rooms.get(roomCode);
    if (!room || room.state) return { error: "Players can only be removed in the lobby" };
    if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can remove players" };
    if (targetId === requestingPlayerId) return { error: "Use Leave Room to leave" };
    const removed = room.lobbyPlayers.find((p) => p.id === targetId);
    if (!removed) return { error: "Player not found" };
    room.lobbyPlayers = room.lobbyPlayers.filter((p) => p.id !== targetId);
    return { room, removed };
  }

  // Hands the host role to a random human who is still in the room (present ones first).
  pickNewHost(room) {
    const pool = room.state ? room.state.players : room.lobbyPlayers;
    const humans = pool.filter((p) => !p.isAI && !p.left);
    const present = humans.filter((p) => p.connected !== false);
    const candidates = present.length ? present : humans;
    if (candidates.length === 0) return null;
    const next = candidates[Math.floor(Math.random() * candidates.length)];
    room.hostPlayerId = next.id;
    return next;
  }

  // After a match: everyone who has not left goes back to the room's lobby (same code, players, AIs).
  returnToLobby(room) {
    const keep = room.state.players.filter((p) => !p.left);
    room.lobbyPlayers = keep.map((p) => ({
      id: p.id,
      name: p.name,
      socketId: p.socketId,
      reconnectToken: p.reconnectToken,
      connected: p.connected,
      isAI: Boolean(p.isAI),
      aiType: p.aiType || null,
    }));
    room.state = null;
    room.config = null;
    if (!room.lobbyPlayers.some((p) => !p.isAI)) {
      this.rooms.delete(room.code);
      return null;
    }
    const host = room.lobbyPlayers.find((p) => p.id === room.hostPlayerId);
    if (!host || !host.connected) this.pickNewHost(room);
    return room;
  }

  startGame({ roomCode, requestingPlayerId, mode }) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: "Room not found" };
    if (room.state) return { error: "Game already started" };
    if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can start the game" };
    if (room.lobbyPlayers.length < 2) return { error: "Need at least 2 players" };
    const absent = room.lobbyPlayers.filter((p) => !p.isAI && !p.connected);
    if (absent.length) return { error: `Waiting for ${absent.map((p) => p.name).join(", ")} — remove them or wait` };

    const config = resolveModeConfig(this.baseConfig, mode || "normal", room.lobbyPlayers.length);
    const matchId = randomUUID();
    const initialSeed = Date.now() >>> 0;
    const state = createMatch({ matchId, mode: config.mode, playersInput: room.lobbyPlayers, initialSeed, config });
    startMatch(state, config);

    room.state = state;
    room.config = config;
    return { room };
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode);
  }

  findRoomByPlayerId(playerId) {
    for (const room of this.rooms.values()) {
      const inLobby = room.lobbyPlayers.some((p) => p.id === playerId);
      const inMatch = room.state && room.state.getPlayer(playerId);
      if (inLobby || inMatch) return room;
    }
    return null;
  }

  reconnect({ roomCode, playerId, reconnectToken, socketId }) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: "Room not found" };
    const player = room.state ? room.state.getPlayer(playerId) : room.lobbyPlayers.find((p) => p.id === playerId);
    if (player && player.left) return { error: "You left this match" };
    if (!player || player.reconnectToken !== reconnectToken) {
      return { error: "Invalid reconnection credentials" };
    }
    player.socketId = socketId;
    player.connected = true;
    return { room, player };
  }

  markDisconnected(playerId) {
    const room = this.findRoomByPlayerId(playerId);
    if (!room) return null;
    const player = room.state ? room.state.getPlayer(playerId) : room.lobbyPlayers.find((p) => p.id === playerId);
    if (player) player.connected = false;
    return room;
  }

  leaveLobby({ roomCode, playerId }) {
    const room = this.rooms.get(roomCode);
    if (!room || room.state) return null;
    room.lobbyPlayers = room.lobbyPlayers.filter((p) => p.id !== playerId);
    if (!room.lobbyPlayers.some((p) => !p.isAI)) {
      this.rooms.delete(roomCode);
      return room;
    }
    // The room is never closed because the host left: a random remaining player becomes host.
    if (room.hostPlayerId === playerId) this.pickNewHost(room);
    return room;
  }

  _generateRoomCode() {
    let code;
    do {
      code = Array.from({ length: 5 }, () => ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]).join("");
    } while (this.rooms.has(code));
    return code;
  }
}
