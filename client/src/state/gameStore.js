import { create } from "zustand";

// Read-only mirror of server state (spec.md §42, §76; analysis.md §4.3).
// The client NEVER mutates `gameState` directly — it is only ever replaced
// wholesale by whatever the server broadcasts. `ui` fields below are the
// only client-local state (selection, action mode, chat, etc).
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
  muted: false,
  helpOpen: false,

  setSocketConnected: (connected) => set({ socketConnected: connected }),
  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),

  setSession: ({ roomCode, playerId, reconnectToken }) => set({ roomCode, playerId, reconnectToken }),

  setLobby: ({ roomCode, players }) => set({ roomCode, lobbyPlayers: players, screen: "lobby" }),
  updateLobbyPlayers: (players) => set({ lobbyPlayers: players }),

  applyGameState: (gameState) =>
    set({
      gameState,
      turnTimeRemaining: gameState.turnTimeRemaining,
      screen: gameState.status === "finished" ? "victory" : "game",
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
  toggleMuted: () => set({ muted: !get().muted }),

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
