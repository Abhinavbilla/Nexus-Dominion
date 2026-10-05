import { useGameStore, getMyPlayer } from "../state/gameStore.js";
import { calculateAttackStrength, calculateDefenseStrength, resolveAttack } from "@hex-dominion/shared/combat.js";
import { boardArrayToMap } from "../boardMap.js";
import { BASE_CONFIG } from "../config.js";
import { sendAction } from "../networking/SocketClient.js";
import "./AttackPreview.css";

export default function AttackPreview() {
  const actionMode = useGameStore((s) => s.actionMode);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const gameState = useGameStore((s) => s.gameState);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const me = getMyPlayer();

  if (actionMode !== "attack" || !selectedHex || !gameState) return null;

  const board = boardArrayToMap(gameState.board);
  const targetHex = board.get(`${selectedHex.q},${selectedHex.r}`);
  if (!targetHex || !targetHex.ownerId || targetHex.ownerId === me.id) return null;

  const hasActiveSupplyChain = gameState.activeSupplyChains.some((c) => c.playerId === me.id && c.active);
  const attack = calculateAttackStrength({
    board,
    targetHex,
    attackerId: me.id,
    hasActiveSupplyChain,
    config: BASE_CONFIG,
    boardRadius: BASE_CONFIG.BOARD_RADIUS,
  });
  const defense = calculateDefenseStrength({ targetHex, config: BASE_CONFIG });
  const outcome = resolveAttack(attack.total, defense.total);
  const defender = gameState.players.find((p) => p.id === targetHex.ownerId);

  function confirm() {
    sendAction("attack", selectedHex);
    clearSelection();
  }

  return (
    <div className="attack-preview glass-panel fade-in-up">
      <h3 className="font-display attack-preview-title">ATTACK PREVIEW</h3>
      <p className="text-dim">
        Target: <span className={`player-${defender?.color}`}>{defender?.name}</span>'s hex ({selectedHex.q}, {selectedHex.r})
      </p>

      <div className="attack-preview-stats">
        <div className="attack-stat">
          <span className="text-faint">ATTACK STRENGTH</span>
          <span className="attack-stat-value">{attack.total}</span>
          <span className="text-faint">
            base {attack.breakdown.base}
            {attack.breakdown.support > 0 && ` +${attack.breakdown.support} support`}
            {attack.breakdown.supplyChain > 0 && ` +${attack.breakdown.supplyChain} chain`}
          </span>
        </div>
        <div className="attack-stat">
          <span className="text-faint">DEFENSE STRENGTH</span>
          <span className="attack-stat-value">{defense.total}</span>
          <span className="text-faint">
            base {defense.breakdown.base}
            {defense.breakdown.fortress > 0 && ` +${defense.breakdown.fortress} fortress`}
            {defense.breakdown.city > 0 && ` +${defense.breakdown.city} city`}
            {defense.breakdown.fortification > 0 && ` +${defense.breakdown.fortification} fortify`}
          </span>
        </div>
      </div>

      <div className={`attack-outcome ${outcome === "SUCCESS" ? "attack-outcome-success" : "attack-outcome-fail"}`}>
        {outcome}
      </div>

      <p className="text-faint">Cost: 1 AP · 3 Metal · 2 Energy</p>

      <div className="menu-actions">
        <button className="btn btn-danger" onClick={confirm}>
          Confirm Attack
        </button>
        <button className="btn" onClick={clearSelection}>
          Cancel
        </button>
      </div>
    </div>
  );
}
