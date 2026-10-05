import { createServer } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";

import { validateGameConfig } from "@hex-dominion/shared/gameConfig.js";
import { endTurn } from "./GameEngine.js";
import { processClaim, processBuild, processAttack, processFortify } from "./ActionProcessor.js";
import { RoomManager } from "./RoomManager.js";
import { createAIController } from "./AIController.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawConfig = JSON.parse(readFileSync(resolve(__dirname, "../gameConfig.json"), "utf-8"));
const baseConfig = validateGameConfig(rawConfig);

const app = express();
app.use(cors());
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Production: serve the built client from the same origin (npm run build).
const clientDist = resolve(__dirname, "../client/dist");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => res.sendFile(resolve(clientDist, "index.html")));
}

const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: "*" } });

const roomManager = new RoomManager(baseConfig);
const roomTimers = new Map();
const aiController = createAIController({ io, broadcastStateUpdate, stopTurnTimer });

function lobbyPlayersPublic(room) {
  return room.lobbyPlayers.map(({ id, name, connected, isAI, aiType, ready }) => ({
    id,
    name,
    connected,
    isAI: Boolean(isAI),
    aiType: aiType || null,
    isHost: id === room.hostPlayerId,
    // the host starts the match and AIs never wait, so both count as ready
    ready: Boolean(isAI) || id === room.hostPlayerId || Boolean(ready),
  }));
}

function getPlayerName(room, playerId) {
  if (room.state) return room.state.getPlayer(playerId)?.name ?? "Unknown";
  return room.lobbyPlayers.find((p) => p.id === playerId)?.name ?? "Unknown";
}

function broadcastStateUpdate(room, event) {
  io.to(room.code).emit("action_result", { success: true, gameState: room.state.toWireFormat(), event });
  aiController.maybeRun(room);
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

// Rematch: everyone who has not left goes back to the room's lobby (same code, same players and
// AIs). The host starts the next match once everybody is present.
function returnToLobby(room) {
  stopTurnTimer(room);
  const lobby = roomManager.returnToLobby(room);
  if (!lobby) return;
  io.to(room.code).emit("back_to_lobby", { roomCode: room.code, players: lobbyPlayersPublic(lobby) });
}

// Takes a participant out of a running or finished match (they left, or the host removed them).
// Their hexes stay on the board and their turns are skipped. If only one participant is left they
// win by forfeit; if no humans remain the room closes so AI-only matches never run forever.
function removeFromMatch(room, player, eventType) {
  const state = room.state;
  player.left = true;
  player.connected = false;
  state.pushEvent({ type: eventType, playerId: player.id });
  if (room.hostPlayerId === player.id) roomManager.pickNewHost(room); // the room outlives its host

  if (state.status === "finished") {
    if (!state.players.some((p) => !p.isAI && !p.left)) roomManager.rooms.delete(room.code);
    return;
  }
  if (state.status !== "playing") return;
  const active = state.players.filter((p) => !p.left);
  if (!active.some((p) => !p.isAI)) {
    state.status = "finished";
    state.winReason = "abandoned";
    stopTurnTimer(room);
    roomManager.rooms.delete(room.code);
    return;
  }
  if (active.length === 1) {
    state.status = "finished";
    state.winnerId = active[0].id;
    state.winReason = "forfeit";
    state.pushEvent({ type: "game_over", winnerId: active[0].id, reason: "forfeit" });
    stopTurnTimer(room);
    broadcastStateUpdate(room, { action: "leave", playerId: player.id });
    return;
  }
  if (state.getCurrentPlayer().id === player.id) {
    const result = endTurn(state, room.config, "left");
    broadcastStateUpdate(room, { action: "end_turn", reason: "left" });
    if (result.matchFinished) stopTurnTimer(room);
  } else {
    broadcastStateUpdate(room, { action: "leave", playerId: player.id });
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

  socket.on("add_ai", ({ aiType } = {}) => {
    const result = roomManager.addAI({ roomCode: socket.data.roomCode, requestingPlayerId: socket.data.playerId, aiType });
    if (result.error) return socket.emit("error", { code: "ADD_AI_FAILED", message: result.error });
    io.to(result.room.code).emit("player_joined", { players: lobbyPlayersPublic(result.room) });
  });

  socket.on("set_ready", ({ ready } = {}) => {
    const result = roomManager.setReady({ roomCode: socket.data.roomCode, playerId: socket.data.playerId, ready });
    if (result.error) return socket.emit("error", { code: "READY_FAILED", message: result.error });
    io.to(result.room.code).emit("player_joined", { players: lobbyPlayersPublic(result.room) });
  });

  // Host-only: remove a player (human or AI) from the lobby. Removed humans are told and can rejoin.
  const handleRemove = (targetId) => {
    const result = roomManager.removePlayer({ roomCode: socket.data.roomCode, requestingPlayerId: socket.data.playerId, targetId });
    if (result.error) return socket.emit("error", { code: "REMOVE_FAILED", message: result.error });
    const { room, removed } = result;
    if (removed.socketId) {
      const target = io.sockets.sockets.get(removed.socketId);
      if (target) {
        target.leave(room.code);
        target.data.roomCode = null;
        target.data.playerId = null;
        target.emit("kicked", { message: "The host removed you from the room." });
      }
    }
    io.to(room.code).emit("player_left", { playerId: removed.id, players: lobbyPlayersPublic(room) });
  };
  socket.on("remove_player", ({ playerId: targetId } = {}) => handleRemove(targetId));
  socket.on("remove_ai", ({ aiPlayerId } = {}) => handleRemove(aiPlayerId));

  socket.on("start_game", ({ mode } = {}) => {
    const roomCode = socket.data.roomCode;
    const result = roomManager.startGame({ roomCode, requestingPlayerId: socket.data.playerId, mode });
    if (result.error) return socket.emit("error", { code: "START_FAILED", message: result.error });

    startTurnTimer(result.room);
    io.to(roomCode).emit("game_started", { gameState: result.room.state.toWireFormat() });
    aiController.maybeRun(result.room);
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
      io.to(roomCode).emit("player_joined", { players: lobbyPlayersPublic(result.room) }); // presence update
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

  socket.on("rematch_vote", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || !room.state || room.state.status !== "finished") return;
    const player = room.state.getPlayer(socket.data.playerId);
    if (!player || player.isAI || player.left) return;
    returnToLobby(room);
  });

  // Leaving a match yourself.
  socket.on("leave_match", () => {
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || !room.state) return;
    const player = room.state.getPlayer(socket.data.playerId);
    if (!player || player.left) return;
    socket.leave(room.code);
    socket.data.roomCode = null;
    socket.data.playerId = null;
    removeFromMatch(room, player, "player_left");
  });

  // Host-only: remove a player (human or AI) from the running match. Not a ban for the room, but
  // a removed player cannot rejoin this match.
  socket.on("kick_player", ({ playerId: targetId } = {}) => {
    const fail = (message) => socket.emit("error", { code: "KICK_FAILED", message });
    const room = roomManager.getRoom(socket.data.roomCode);
    if (!room || !room.state || room.state.status !== "playing") return fail("No match in progress");
    if (room.hostPlayerId !== socket.data.playerId) return fail("Only the host can remove players");
    if (targetId === socket.data.playerId) return fail("Use Exit to leave the match yourself");
    const target = room.state.getPlayer(targetId);
    if (!target || target.left) return fail("Player not found");
    if (target.socketId) {
      const targetSocket = io.sockets.sockets.get(target.socketId);
      if (targetSocket) {
        targetSocket.leave(room.code);
        targetSocket.data.roomCode = null;
        targetSocket.data.playerId = null;
        targetSocket.emit("kicked", { message: "The host removed you from the match." });
      }
    }
    removeFromMatch(room, target, "player_kicked");
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
    if (!room) return;
    io.to(room.code).emit("player_disconnected", { playerId });
    if (room.state) return;
    io.to(room.code).emit("player_joined", { players: lobbyPlayersPublic(room) }); // presence update
    if (room.hostPlayerId === playerId) {
      // Give a refreshing host 20 seconds to come back before handing the room to someone else.
      setTimeout(() => {
        const r = roomManager.getRoom(room.code);
        const host = r && !r.state && r.lobbyPlayers.find((p) => p.id === playerId);
        if (host && !host.connected && r.hostPlayerId === playerId) {
          roomManager.pickNewHost(r);
          io.to(r.code).emit("player_joined", { players: lobbyPlayersPublic(r) });
        }
      }, 20000);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`NEXUS: DOMINION server listening on port ${PORT}`);
});
