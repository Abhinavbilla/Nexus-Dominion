import { useEffect } from "react";
import { useGameStore, getMyPlayer, isMyTurn } from "../state/gameStore.js";
import { endPlayerTurn } from "../networking/SocketClient.js";
import { BASE_CONFIG } from "../config.js";
import Icon from "./Icon.jsx";
import { CostChips } from "./bits.jsx";
import "./ActionBar.css";

const ACTIONS = [
  { mode: "claim", label: "Claim", icon: "claim", key: "C", hint: "Take a neutral hex next to your land", tint: "#ffd47a" },
  { mode: "build", label: "Build", icon: "build", key: "B", hint: "Factory, Fortress or City", tint: "#4cc9b0" },
  { mode: "attack", label: "Attack", icon: "attack", key: "A", hint: "Capture an adjacent enemy hex", cost: BASE_CONFIG.ATTACK_COSTS, tint: "#ff6a6a" },
  { mode: "fortify", label: "Fortify", icon: "fortify", key: "F", hint: "Raise a hex's defense by 1", cost: BASE_CONFIG.FORTIFY_COSTS, tint: "#5aa9ff" },
];

function lacks(me, cost) {
  return Boolean(cost) && ["wood", "metal", "energy"].some((k) => cost[k] && (me?.resources[k] ?? 0) < cost[k]);
}

export default function ActionBar() {
  const actionMode = useGameStore((s) => s.actionMode);
  const setActionMode = useGameStore((s) => s.setActionMode);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const gameState = useGameStore((s) => s.gameState);

  const myTurn = isMyTurn();
  const me = getMyPlayer();
  const ap = me?.actionPoints ?? 0;
  const playing = gameState?.status === "playing";
  const canAct = myTurn && playing && ap > 0;

  function toggle(mode) {
    setActionMode(actionMode === mode ? null : mode);
  }

  function endTurn() {
    clearSelection();
    endPlayerTurn();
  }

  // Keyboard shortcuts: C/B/A/F choose an action, E ends the turn, Esc cancels.
  useEffect(() => {
    function onKey(e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const k = e.key.toLowerCase();
      if (k === "escape") return clearSelection();
      if (!myTurn || !playing) return;
      if (k === "e") return endTurn();
      const action = ACTIONS.find((a) => a.key.toLowerCase() === k);
      if (action && canAct && !lacks(me, action.cost)) toggle(action.mode);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="action-bar glass-panel">
      <h3 className="panel-title">ACTIONS</h3>
      <div className="action-bar-grid">
        {ACTIONS.map((a) => {
          const short = lacks(me, a.cost);
          const disabled = !canAct || short;
          const active = actionMode === a.mode;
          return (
            <button
              key={a.mode}
              className={`action-btn ${active ? "action-btn-active" : ""}`}
              style={{ "--tint": a.tint }}
              disabled={disabled}
              onClick={() => toggle(a.mode)}
              title={short ? "Not enough resources" : a.hint}
            >
              <span className="action-btn-icon">
                <Icon name={a.icon} size={26} color={a.tint} />
              </span>
              <span className="action-btn-body">
                <span className="action-btn-label">{a.label}</span>
                <span className="action-btn-sub">{a.cost ? <CostChips cost={a.cost} have={me?.resources} size={12} /> : <span className="text-faint">{a.mode === "build" ? "cost varies" : "free"}</span>}</span>
              </span>
              <kbd className="action-btn-key">{a.key}</kbd>
            </button>
          );
        })}
      </div>

      <button className={`btn action-end ${myTurn && playing && ap === 0 ? "action-end-ready" : ""}`} disabled={!myTurn || !playing} onClick={endTurn}>
        <Icon name="endturn" size={16} />
        End Turn
        <kbd className="action-btn-key">E</kbd>
      </button>
      {!myTurn && playing && <p className="text-faint action-wait">Waiting for your turn…</p>}
      {myTurn && playing && ap === 0 && <p className="action-wait action-wait-ready">No actions left — end your turn.</p>}
    </div>
  );
}
