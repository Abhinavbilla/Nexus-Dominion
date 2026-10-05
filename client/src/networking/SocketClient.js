import { io } from "socket.io-client";
import { useGameStore } from "../state/gameStore.js";
import { playSfxForEvent, playResultSfx, playYourTurnSfx } from "../audio/AudioManager.js";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || (import.meta.env.PROD ? window.location.origin : "http://localhost:3001");
const SESSION_KEY = "hexdominion_session";

export const socket = io(SERVER_URL, { autoConnect: false });

function saveSession({ roomCode, playerId, reconnectToken }) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerId, reconnectToken }));
}

function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

let initialized = false;

// Wires Socket.IO events to the Zustand store (spec.md §42, §45-46). The
// client never applies deltas — every gameState it receives fully replaces
// the mirror (decisions.md #9).
export function initSocketClient() {
  if (initialized) return;
  initialized = true;

  const store = useGameStore.getState();

  socket.on("connect", () => {
    useGameStore.getState().setSocketConnected(true);
    const session = loadSession();
    if (session?.roomCode && session?.playerId && session?.reconnectToken) {
      // Restore identity locally first so isMyTurn()/getMyPlayer() work as soon as state_sync arrives.
      useGameStore.getState().setSession(session);
      socket.emit("reconnect_player", session);
    }
  });

  socket.on("disconnect", () => {
    useGameStore.getState().setSocketConnected(false);
  });

  socket.on("error", ({ code, message }) => {
    if (code === "RECONNECT_FAILED") {
      // Room is gone (e.g. server restarted): drop the stale session and go back to the menu.
      clearSession();
      useGameStore.getState().resetToMenu();
    }
    useGameStore.getState().setError(message || code);
  });

  socket.on("room_created", ({ roomCode, playerId, reconnectToken, players }) => {
    saveSession({ roomCode, playerId, reconnectToken });
    useGameStore.getState().setSession({ roomCode, playerId, reconnectToken });
    useGameStore.getState().setLobby({ roomCode, players });
  });

  socket.on("room_joined", ({ roomCode, playerId, reconnectToken, players }) => {
    saveSession({ roomCode, playerId, reconnectToken });
    useGameStore.getState().setSession({ roomCode, playerId, reconnectToken });
    useGameStore.getState().setLobby({ roomCode, players });
  });

  socket.on("player_joined", ({ players }) => useGameStore.getState().updateLobbyPlayers(players));
  socket.on("player_left", ({ players }) => useGameStore.getState().updateLobbyPlayers(players));

  socket.on("game_started", ({ gameState }) => useGameStore.getState().applyGameState(gameState));
  socket.on("action_result", ({ gameState, event }) => {
    const previous = useGameStore.getState().gameState;
    useGameStore.getState().applyGameState(gameState);
    playSfxForEvent(event);

    const me = useGameStore.getState().playerId;
    const isMine = (g) => g?.players[g.currentPlayerIndex]?.id === me;
    if (gameState.status === "finished") playResultSfx(gameState, me);
    else if (isMine(gameState) && !isMine(previous)) playYourTurnSfx();
  });
  socket.on("state_sync", ({ gameState }) => useGameStore.getState().applyGameState(gameState));

  socket.on("timer_tick", ({ turnTimeRemaining }) => useGameStore.getState().setTurnTimeRemaining(turnTimeRemaining));

  socket.on("ai_explanation", (entry) => useGameStore.getState().pushAIExplanation(entry));

  socket.on("chat_message", (message) => useGameStore.getState().pushChatMessage(message));

  socket.on("player_disconnected", ({ playerId }) => {
    useGameStore.getState().setError(null);
  });

  socket.connect();
}

export function createRoom(playerName) {
  socket.emit("create_room", { playerName });
}

export function joinRoom(roomCode, playerName) {
  socket.emit("join_room", { roomCode, playerName });
}

export function startGame(mode = "normal") {
  socket.emit("start_game", { mode });
}

export function addAI(aiType) {
  socket.emit("add_ai", { aiType });
}

export function removeAI(aiPlayerId) {
  socket.emit("remove_ai", { aiPlayerId });
}

export function sendAction(type, params) {
  socket.emit("action", { type, params });
}

export function endPlayerTurn() {
  socket.emit("end_turn");
}

export function sendChatMessage(text) {
  socket.emit("chat_message", { text });
}

// Leave a match in progress (the server skips your turns / awards a forfeit win if you were the last opponent).
export function leaveMatch() {
  socket.emit("leave_match");
  clearSession();
  useGameStore.getState().resetToMenu();
}

export function leaveRoom() {
  socket.emit("leave_room");
  clearSession();
  useGameStore.getState().resetToMenu();
}
