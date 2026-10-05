import { useEffect, useRef } from "react";
import { useGameStore, getMyPlayer } from "../state/gameStore.js";
import { calculateAttackStrength, calculateDefenseStrength, resolveAttack } from "@hex-dominion/shared/combat.js";
import { boardArrayToMap } from "../boardMap.js";
import { BASE_CONFIG } from "../config.js";
import { sendAction } from "../networking/SocketClient.js";
import Icon from "./Icon.jsx";
import { CostChips } from "./bits.jsx";
import "./AttackPreview.css";

function Pill({ label, value }) {
  return (
    <span className="atk-pill">
      {label} <b className="mono">+{value}</b>
    </span>
  );
}

export default function AttackPreview() {
  const actionMode = useGameStore((s) => s.actionMode);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const gameState = useGameStore((s) => s.gameState);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const me = getMyPlayer();
  const rootRef = useRef(null);

  // The left panel scrolls on short screens; keep Confirm/Cancel reachable.
  useEffect(() => {
    rootRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedHex, actionMode]);

  if (actionMode !== "attack" || !selectedHex || !gameState) return null;

  const board = boardArrayToMap(gameState.board);
  const targetHex = board.get(`${selectedHex.q},${selectedHex.r}`);
  if (!targetHex || !targetHex.ownerId || targetHex.ownerId === me.id) return null;

  const hasActiveSupplyChain = gameState.activeSupplyChains.some((c) => c.playerId === me.id && c.active);
  const attack = calculateAttackStrength({ board, targetHex, attackerId: me.id, hasActiveSupplyChain, config: BASE_CONFIG, boardRadius: BASE_CONFIG.BOARD_RADIUS });
  const defense = calculateDefenseStrength({ targetHex, config: BASE_CONFIG });
  const outcome = resolveAttack(attack.total, defense.total);
  const defender = gameState.players.find((p) => p.id === targetHex.ownerId);
  const success = outcome === "SUCCESS";
  const max = Math.max(attack.total, defense.total, 1);

  function confirm() {
    sendAction("attack", selectedHex);
    clearSelection();
  }

  return (
    <div ref={rootRef} className="attack-preview glass-panel fade-in-up">
      <h3 className="panel-title" style={{ color: "#ff8a8a" }}>
        ATTACK
      </h3>
      <p className="atk-target text-dim">
        <span className={`player-${defender?.color}`}>{defender?.name}</span> · hex ({selectedHex.q}, {selectedHex.r})
      </p>

      <div className="atk-versus">
        <div className="atk-side atk-side-you">
          <span className="atk-side-label">YOU</span>
          <span className="atk-num mono">{attack.total}</span>
          <div className="atk-bar">
            <div className="atk-bar-fill atk-bar-you" style={{ height: `${(attack.total / max) * 100}%` }} />
          </div>
          <div className="atk-pills">
            <Pill label="Base" value={attack.breakdown.base} />
            {attack.breakdown.support > 0 && <Pill label="Support" value={attack.breakdown.support} />}
            {attack.breakdown.supplyChain > 0 && <Pill label="Chain" value={attack.breakdown.supplyChain} />}
          </div>
        </div>

        <Icon name="attack" size={26} color="var(--text-faint)" className="atk-vs" />

        <div className="atk-side atk-side-them">
          <span className="atk-side-label">DEFENSE</span>
          <span className="atk-num mono">{defense.total}</span>
          <div className="atk-bar">
            <div className="atk-bar-fill atk-bar-them" style={{ height: `${(defense.total / max) * 100}%` }} />
          </div>
          <div className="atk-pills">
            <Pill label="Base" value={defense.breakdown.base} />
            {defense.breakdown.fortress > 0 && <Pill label="Fortress" value={defense.breakdown.fortress} />}
            {defense.breakdown.city > 0 && <Pill label="City" value={defense.breakdown.city} />}
            {defense.breakdown.fortification > 0 && <Pill label="Fortified" value={defense.breakdown.fortification} />}
          </div>
        </div>
      </div>

      <div className={`atk-verdict ${success ? "atk-verdict-win" : "atk-verdict-lose"}`}>
        <Icon name={success ? "crown" : "fortify"} size={18} />
        {success ? "SUCCESS — you capture the hex" : "FAILED — the defense holds"}
      </div>

      <div className="atk-cost">
        <span className="text-faint">Cost</span> <CostChips cost={BASE_CONFIG.ATTACK_COSTS} have={me?.resources} /> <span className="text-faint">· 1 action</span>
      </div>

      <div className="atk-actions">
        <button className="btn btn-danger" onClick={confirm}>
          Confirm Attack
        </button>
        <button className="btn btn-ghost" onClick={clearSelection}>
          Cancel
        </button>
      </div>
    </div>
  );
}
