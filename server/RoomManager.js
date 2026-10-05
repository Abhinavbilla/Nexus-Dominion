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

  removeAI({ roomCode, requestingPlayerId, aiPlayerId }) {
    const room = this.rooms.get(roomCode);
    if (!room || room.state) return { error: "Cannot remove AI now" };
    if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can remove AI players" };
    room.lobbyPlayers = room.lobbyPlayers.filter((p) => !(p.isAI && p.id === aiPlayerId));
    return { room };
  }

  startGame({ roomCode, requestingPlayerId, mode }) {
    const room = this.rooms.get(roomCode);
    if (!room) return { error: "Room not found" };
    if (room.state) return { error: "Game already started" };
    if (room.hostPlayerId !== requestingPlayerId) return { error: "Only the host can start the game" };
    if (room.lobbyPlayers.length < 2) return { error: "Need at least 2 players" };

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
    if (room.lobbyPlayers.length === 0) this.rooms.delete(roomCode);
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
