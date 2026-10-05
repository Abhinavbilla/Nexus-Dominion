import { create } from "zustand";

// Read-only mirror of server state (spec.md §42, §76; analysis.md §4.3).
// The client NEVER mutates `gameState` directly — it is only ever replaced
// wholesale by whatever the server broadcasts. `ui` fields below are the
// only client-local state (selection, action mode, chat, etc).
// Sound settings are remembered between visits (private windows may block storage; that is fine).
const AUDIO_KEY = "hexdominion_audio";
function loadAudioSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) || "{}");
    return { muted: Boolean(saved.muted), volume: typeof saved.volume === "number" ? Math.min(1, Math.max(0, saved.volume)) : 0.7 };
  } catch {
    return { muted: false, volume: 0.7 };
  }
}
function saveAudioSettings({ muted, volume }) {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify({ muted, volume }));
  } catch {
    /* storage unavailable */
  }
}
const initialAudio = loadAudioSettings();

export const useGameStore = create((set, get) => ({
  // --- connection / session ---
  socketConnected: false,
  roomCode: null,
  playerId: null,
  reconnectToken: null,
  screen: "menu", // menu | lobby | game | victory
  lobbyPlayers: [],
  error: null,

  // --- authoritative mirror ---
  gameState: null,
  turnTimeRemaining: null,

  // --- chat (ephemeral, not persisted) ---
  chatMessages: [],

  // --- AI explanations (real heuristic breakdowns, spec.md §52) ---
  aiExplanations: [],

  // --- local UI only ---
  selectedHex: null,
  hoveredHex: null,
  actionMode: null, // "claim" | "build" | "attack" | "fortify" | null
  pendingBuildType: null,
  muted: initialAudio.muted,
  volume: initialAudio.volume,
  helpOpen: false,

  setSocketConnected: (connected) => set({ socketConnected: connected }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  setSession: ({ roomCode, playerId, reconnectToken }) => set({ roomCode, playerId, reconnectToken }),

  setLobby: ({ roomCode, players }) => set({ roomCode, lobbyPlayers: players, screen: "lobby" }),
  updateLobbyPlayers: (players) => set({ lobbyPlayers: players }),

  // A new matchId means a rematch started: clear everything tied to the previous match.
  applyGameState: (gameState) => {
    const prev = get().gameState;
    const fresh = prev && prev.matchId !== gameState.matchId;
    set({
      gameState,
      turnTimeRemaining: gameState.turnTimeRemaining,
      screen: gameState.status === "finished" ? "victory" : "game",
      ...(!prev || fresh
        ? { aiExplanations: [], selectedHex: null, actionMode: null, pendingBuildType: null, hoveredHex: null, helpOpen: false }
        : {}),
    });
  },
  // Back to the room lobby after a match (rematch): keep the room, drop everything about the old match.
  returnToLobby: (players) =>
    set({
      screen: "lobby",
      lobbyPlayers: players,
      gameState: null,
      turnTimeRemaining: null,
      aiExplanations: [],
      selectedHex: null,
      actionMode: null,
      pendingBuildType: null,
      hoveredHex: null,
      helpOpen: false,
      error: null,
    }),

  setTurnTimeRemaining: (seconds) => set({ turnTimeRemaining: seconds }),

  pushChatMessage: (message) => set({ chatMessages: [...get().chatMessages, message].slice(-100) }),

  pushAIExplanation: (entry) => set({ aiExplanations: [...get().aiExplanations, entry].slice(-30) }),

  setHoveredHex: (hex) => set({ hoveredHex: hex }),
  setSelectedHex: (hex) => set({ selectedHex: hex }),
  setActionMode: (mode) => set({ actionMode: mode, pendingBuildType: null }),
  setPendingBuildType: (buildingType) => set({ pendingBuildType: buildingType }),
  clearSelection: () => set({ selectedHex: null, actionMode: null, pendingBuildType: null }),

  setHelpOpen: (open) => set({ helpOpen: open }),
  toggleMuted: () => {
    set({ muted: !get().muted });
    saveAudioSettings(get());
  },
  setVolume: (volume) => {
    set({ volume });
    saveAudioSettings(get());
  },

  resetToMenu: () =>
    set({
      roomCode: null,
      playerId: null,
      reconnectToken: null,
      screen: "menu",
      lobbyPlayers: [],
      gameState: null,
      turnTimeRemaining: null,
      chatMessages: [],
      aiExplanations: [],
      selectedHex: null,
      actionMode: null,
      pendingBuildType: null,
      error: null,
    }),
}));

export function getMyPlayer() {
  const { gameState, playerId } = useGameStore.getState();
  if (!gameState) return null;
  return gameState.players.find((p) => p.id === playerId) || null;
}

export function isMyTurn() {
  const { gameState, playerId } = useGameStore.getState();
  if (!gameState) return false;
  return gameState.players[gameState.currentPlayerIndex]?.id === playerId;
}
