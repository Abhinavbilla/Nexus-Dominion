import { useGameStore } from "../state/gameStore.js";
import { leaveRoom } from "../networking/SocketClient.js";
import "./VictoryScreen.css";

export default function VictoryScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  if (!gameState) return null;

  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const isDraw = !winner;
  const outcome = isDraw ? "draw" : winner.id === playerId ? "won" : "lost";
  const OUTCOME_TEXT = { won: "YOU WON", lost: "YOU LOST", draw: "IT'S A DRAW" };

  return (
    <div className="victory-root">
      <div className="scanline-backdrop" />
      <div className="victory-panel glass-panel fade-in-up">
        <h1 className="font-display victory-game-title">NEXUS: DOMINION</h1>
        <div className={`font-display victory-outcome victory-outcome-${outcome}`}>{OUTCOME_TEXT[outcome]}</div>
        {isDraw ? (
          <h2 className="font-display victory-winner">DRAW</h2>
        ) : (
          <>
            <span className="text-dim">WINNER</span>
            <h2 className={`font-display victory-winner player-${winner.color}`}>{winner.name}</h2>
            <span className="victory-score">◆ {winner.dominionPoints} Dominion</span>
          </>
        )}

        <div className="victory-stats">
          {gameState.players.map((p) => (
            <div className="victory-stat-row" key={p.id}>
              <span className={`player-${p.color} victory-stat-name`}>{p.name}</span>
              <span className="text-faint">◆{p.dominionPoints}</span>
              <span className="text-faint">Chains {p.stats.chainsCompleted}</span>
              <span className="text-faint">Attacks {p.stats.attacksSucceeded}/{p.stats.attacksLaunched}</span>
              <span className="text-faint">Built {p.stats.buildingsBuilt}</span>
            </div>
          ))}
        </div>

        <button className="btn btn-primary" onClick={leaveRoom}>
          Return to Main Menu
        </button>
      </div>
    </div>
  );
}
