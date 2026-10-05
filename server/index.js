import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { validateGameConfig } from "@hex-dominion/shared/gameConfig.js";
import { endTurn } from "./GameEngine.js";
import { processClaim, processBuild, processAttack, processFortify } from "./ActionProcessor.js";
import { RoomManager } from "./RoomManager.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawConfig = JSON.parse(readFileSync(resolve(__dirname, "../gameConfig.json"), "utf-8"));
const baseConfig = validateGameConfig(rawConfig);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ status: "ok" }));

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const roomManager = new RoomManager(baseConfig);
const roomTimers = new Map();

function lobbyPlayersPublic(room) {
  return room.lobbyPlayers.map(({ id, name, connected }) => ({ id, name, connected }));
}

function getPlayerName(room, playerId) {
  if (room.state) return room.state.getPlayer(playerId)?.name ?? "Unknown";
  return room.lobbyPlayers.find((p) => p.id === playerId)?.name ?? "Unknown";
}

function broadcastStateUpdate(room, event) {
  io.to(room.code).emit("action_result", { success: true, gameState: room.state.toWireFormat(), event });
}

function startTurnTimer(room) {
  stopTurnTimer(room);
  const interval = setInterval(() => {
    const state = room.state;
    if (!state || state.status !== "playing") {
      stopTurnTimer(room);
      return;
    }
    state.turnTimeRemaining -= 1;
    if (state.turnTimeRemaining <= 0) {
      const result = endTurn(state, room.config, "timeout");
      broadcastStateUpdate(room, { action: "end_turn", reason: "timeout" });
      if (result.matchFinished) stopTurnTimer(room);
    } else {
      io.to(room.code).emit("timer_tick", { turnTimeRemaining: state.turnTimeRemaining });
    }
  }, 1000);
  roomTimers.set(room.code, interval);
}

function stopTurnTimer(room) {
  const timer = roomTimers.get(room.code);
  if (timer) {
    clearInterval(timer);
    roomTimers.delete(room.code);
  }
}

const ACTION_HANDLERS = {
  claim: processClaim,
  build: processBuild,
  attack: processAttack,
  fortify: processFortify,
};

io.on("connection", (socket) => {
  socket.emit("connected", { socketId: socket.id });

  socket.on("create_room", ({ playerName } = {}) => {
    const { room, playerId, reconnectToken } = roomManager.createRoom({
      hostName: playerName || "Player",
      socketId: socket.id,
    });
    socket.data.playerId = playerId;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    socket.emit("room_created", { roomCode: room.code, playerId, reconnectToken, players: lobbyPlayersPublic(room) });
  });

  socket.on("join_room", ({ roomCode, playerName } = {}) => {
    const result = roomManager.joinRoom({
      roomCode: (roomCode || "").toUpperCase(),
      playerName: playerName || "Player",
      socketId: socket.id,
    });
    if (result.error) return socket.emit("error", { code: "JOIN_FAILED", message: result.error });

    socket.data.playerId = result.playerId;
    socket.data.roomCode = result.room.code;
    socket.join(result.room.code);
    socket.emit("room_joined", {
      roomCode: result.room.code,
      playerId: result.playerId,
      reconnectToken: result.reconnectToken,
      players: lobbyPlayersPublic(result.room),
    });
    io.to(result.room.code).emit("player_joined", { players: lobbyPlayersPublic(result.room) });
  });

  socket.on("start_game", ({ mode } = {}) => {
    const roomCode = socket.data.roomCode;
    const result = roomManager.startGame({ roomCode, requestingPlayerId: socket.data.playerId, mode });
    if (result.error) return socket.emit("error", { code: "START_FAILED", message: result.error });

    startTurnTimer(result.room);
    io.to(roomCode).emit("game_started", { gameState: result.room.state.toWireFormat() });
  });

  socket.on("action", ({ type, params } = {}) => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || !room.state) return socket.emit("error", { code: "NO_GAME", message: "Game not started" });

    const state = room.state;
    if (state.getCurrentPlayer().id !== socket.data.playerId) {
      return socket.emit("error", { code: "NOT_YOUR_TURN", message: "Not your turn" });
    }

    const handler = ACTION_HANDLERS[type];
    if (!handler) return socket.emit("error", { code: "UNKNOWN_ACTION", message: "Unknown action type" });

    const result = handler(state, room.config, socket.data.playerId, params || {});
    if (!result.success) return socket.emit("error", { code: "ACTION_REJECTED", message: result.error });

    const player = state.getPlayer(socket.data.playerId);
    let turnInfo = null;
    if (state.status === "playing" && player.actionPoints <= 0) {
      turnInfo = endTurn(state, room.config, "no_ap");
    }

    broadcastStateUpdate(room, result.event);
    if (turnInfo?.matchFinished) stopTurnTimer(room);
  });

  socket.on("end_turn", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || !room.state) return;
    if (room.state.getCurrentPlayer().id !== socket.data.playerId) {
      return socket.emit("error", { code: "NOT_YOUR_TURN", message: "Not your turn" });
    }
    const result = endTurn(room.state, room.config, "manual");
    broadcastStateUpdate(room, { action: "end_turn", reason: "manual" });
    if (result.matchFinished) stopTurnTimer(room);
  });

  socket.on("reconnect_player", ({ roomCode, playerId, reconnectToken } = {}) => {
    const result = roomManager.reconnect({ roomCode, playerId, reconnectToken, socketId: socket.id });
    if (result.error) return socket.emit("error", { code: "RECONNECT_FAILED", message: result.error });

    socket.data.playerId = playerId;
    socket.data.roomCode = roomCode;
    socket.join(roomCode);
    io.to(roomCode).emit("player_reconnected", { playerId });

    if (result.room.state) {
      socket.emit("state_sync", { gameState: result.room.state.toWireFormat() });
    } else {
      socket.emit("room_joined", {
        roomCode,
        playerId,
        reconnectToken,
        players: lobbyPlayersPublic(result.room),
      });
    }
  });

  socket.on("chat_message", ({ text } = {}) => {
    const roomCode = socket.data.roomCode;
    const playerId = socket.data.playerId;
    if (!roomCode || !playerId || !text || !text.trim()) return;
    const room = roomManager.getRoom(roomCode);
    if (!room) return;

    io.to(roomCode).emit("chat_message", {
      playerId,
      name: getPlayerName(room, playerId),
      text: text.trim().slice(0, 300),
      timestamp: Date.now(),
    });
  });

  socket.on("leave_room", () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;
    const room = roomManager.leaveLobby({ roomCode, playerId });
    if (room) io.to(roomCode).emit("player_left", { playerId, players: lobbyPlayersPublic(room) });
  });

  socket.on("disconnect", () => {
    const playerId = socket.data.playerId;
    if (!playerId) return;
    const room = roomManager.markDisconnected(playerId);
    if (room) io.to(room.code).emit("player_disconnected", { playerId });
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`NEXUS: DOMINION server listening on port ${PORT}`);
});
