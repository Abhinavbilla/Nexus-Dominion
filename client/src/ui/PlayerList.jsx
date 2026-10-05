import { useGameStore } from "../state/gameStore.js";
import "./PlayerList.css";

export default function PlayerList() {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  return (
    <div className="player-list glass-panel">
      <h3 className="font-display player-list-title">COMMANDERS</h3>
      {gameState.players.map((p, i) => {
        const isCurrent = i === gameState.currentPlayerIndex && gameState.status === "playing";
        return (
          <div className={`player-row ${isCurrent ? "player-row-active" : ""}`} key={p.id}>
            <span className={`player-dot player-${p.color}`} />
            <div className="player-row-info">
              <span className={`player-row-name ${!p.connected ? "text-faint" : ""}`}>
                {p.name}{p.isAI && " 🤖"}
                {!p.connected && " (offline)"}
              </span>
              <span className="text-faint player-row-stats">
                ◆ {p.dominionPoints} · 🪵{p.resources.wood} ⛏{p.resources.metal} ⚡{p.resources.energy}
              </span>
            </div>
            {isCurrent && <span className="player-row-badge">▶</span>}
          </div>
        );
      })}
    </div>
  );
}
