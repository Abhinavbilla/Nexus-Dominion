import { useGameStore, getMyPlayer, isMyTurn } from "../state/gameStore.js";
import { getModeConfig } from "../config.js";
import "./HUD.css";

export default function HUD() {
  const gameState = useGameStore((s) => s.gameState);
  const turnTimeRemaining = useGameStore((s) => s.turnTimeRemaining);
  const muted = useGameStore((s) => s.muted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const me = getMyPlayer();
  const myTurn = isMyTurn();
  const currentPlayer = gameState?.players[gameState.currentPlayerIndex];

  if (!gameState || !me) return null;

  const maxRounds = getModeConfig(gameState.mode).MAX_ROUNDS;
  const timerLow = turnTimeRemaining <= 10;

  return (
    <div className="hud glass-panel">
      <div className="hud-section">
        <span className="text-faint">ROUND</span>
        <span className="hud-value font-display">
          {gameState.currentRound}/{maxRounds}
        </span>
      </div>

      <div className="hud-section hud-turn">
        <span className="text-faint">TURN</span>
        <span className={`hud-value font-display player-${currentPlayer?.color}`}>
          {myTurn ? "YOUR TURN" : currentPlayer?.name}
        </span>
      </div>

      {gameState.thresholdReached && (
        <div className="hud-section">
          <span className="text-faint">FINAL ROUND</span>
          <span className="hud-value font-display">Score reached</span>
        </div>
      )}

      <div className={`hud-section hud-timer ${timerLow ? "hud-timer-low" : ""}`}>
        <span className="text-faint">TIME</span>
        <span className="hud-value font-display">{turnTimeRemaining ?? "--"}s</span>
      </div>

      <div className="hud-divider" />

      <div className="hud-resources">
        <span className="hud-resource">🪵 {me.resources.wood}</span>
        <span className="hud-resource">⛏ {me.resources.metal}</span>
        <span className="hud-resource">⚡ {me.resources.energy}</span>
        <span className="hud-resource hud-dominion">◆ {me.dominionPoints} DP</span>
        <span className="hud-resource">AP {me.actionPoints}/2</span>
      </div>

      <button className="hud-mute" onClick={toggleMuted} title={muted ? "Unmute" : "Mute"}>
        {muted ? "🔇" : "🔊"}
      </button>
    </div>
  );
}
