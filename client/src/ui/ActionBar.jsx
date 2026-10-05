import { useGameStore, getMyPlayer, isMyTurn } from "../state/gameStore.js";
import { endPlayerTurn } from "../networking/SocketClient.js";
import "./ActionBar.css";

const ACTIONS = [
  { mode: "claim", label: "Claim", hint: "1 AP" },
  { mode: "build", label: "Build", hint: "1 AP + cost" },
  { mode: "attack", label: "Attack", hint: "1 AP · 3 Metal · 2 Energy" },
  { mode: "fortify", label: "Fortify", hint: "1 AP · 2 Metal · 1 Energy" },
];

export default function ActionBar() {
  const actionMode = useGameStore((s) => s.actionMode);
  const setActionMode = useGameStore((s) => s.setActionMode);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const gameState = useGameStore((s) => s.gameState);

  const myTurn = isMyTurn();
  const me = getMyPlayer();
  const ap = me?.actionPoints ?? 0;
  const disabled = !myTurn || gameState?.status !== "playing" || ap <= 0;

  function toggle(mode) {
    setActionMode(actionMode === mode ? null : mode);
  }

  return (
    <div className="action-bar glass-panel">
      <h3 className="font-display action-bar-title">ACTIONS</h3>
      <div className="action-bar-grid">
        {ACTIONS.map((a) => (
          <button
            key={a.mode}
            className={`action-btn ${actionMode === a.mode ? "action-btn-active" : ""}`}
            disabled={disabled}
            onClick={() => toggle(a.mode)}
            title={a.hint}
          >
            <span>{a.label}</span>
            <span className="action-btn-hint text-faint">{a.hint}</span>
          </button>
        ))}
      </div>
      <button className="btn btn-danger action-bar-endturn" disabled={!myTurn || gameState?.status !== "playing"} onClick={() => { clearSelection(); endPlayerTurn(); }}>
        End Turn
      </button>
      {!myTurn && gameState?.status === "playing" && (
        <p className="text-faint action-bar-wait">Waiting for your turn...</p>
      )}
    </div>
  );
}
