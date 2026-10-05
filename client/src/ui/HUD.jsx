import { useGameStore, getMyPlayer, isMyTurn } from "../state/gameStore.js";
import { rulesOf } from "./rules.js";
import Icon from "./Icon.jsx";
import { PlayerEmblem, ResourceChip } from "./bits.jsx";
import "./HUD.css";

function TimerRing({ seconds, total }) {
  const r = 17;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, (seconds ?? 0) / total));
  const low = seconds != null && seconds <= 8;
  return (
    <div className={`timer-ring ${low ? "timer-ring-low" : ""}`} title="Time left this turn">
      <svg width="44" height="44" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
        <circle
          cx="22"
          cy="22"
          r={r}
          fill="none"
          stroke={low ? "var(--danger)" : "var(--gold)"}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - frac)}
          transform="rotate(-90 22 22)"
          style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="timer-ring-text mono">{seconds ?? "--"}</span>
    </div>
  );
}

export default function HUD() {
  const gameState = useGameStore((s) => s.gameState);
  const turnTimeRemaining = useGameStore((s) => s.turnTimeRemaining);
  const muted = useGameStore((s) => s.muted);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const me = getMyPlayer();
  const myTurn = isMyTurn();
  const current = gameState?.players[gameState.currentPlayerIndex];

  if (!gameState || !me) return null;

  const rules = rulesOf(gameState);
  const dpPct = Math.min(100, (me.dominionPoints / rules.victoryScore) * 100);

  return (
    <div className="hud glass-panel">
      <div className="hud-brand">
        <svg width="30" height="30" viewBox="0 0 40 40">
          <path d="M20 2.5 35.5 11v18L20 37.5 4.5 29V11z" fill="none" stroke="var(--gold)" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M20 10 28.5 15v10L20 30l-8.5-5V15z" fill="var(--gold)" fillOpacity="0.85" />
        </svg>
        <span className="hud-brand-text font-title">NEXUS</span>
      </div>

      <div className="hud-block" title="A round is one full cycle: every player takes one turn. Resources are produced at the start of each round.">
        <span className="hud-label">ROUND</span>
        <span className="hud-big mono">{gameState.currentRound}</span>
        <span className="hud-sub">everyone plays once</span>
      </div>

      <div className={`hud-turn ${myTurn ? "hud-turn-mine" : ""}`}>
        <PlayerEmblem color={current?.color} name={current?.name} ai={current?.isAI} size={38} active />
        <div className="hud-turn-text">
          <span className="hud-label">{myTurn ? "YOUR TURN" : "TURN"}</span>
          <span className={`hud-turn-name player-${current?.color}`}>{current?.name}</span>
        </div>
        <TimerRing seconds={turnTimeRemaining} total={rules.turnSeconds} />
      </div>

      {gameState.thresholdReached && (
        <div className="hud-final">
          <span>FINAL ROUND</span>
        </div>
      )}

      <div className="hud-spacer" />

      <div className="hud-resources">
        <ResourceChip kind="wood" value={me.resources.wood} />
        <ResourceChip kind="metal" value={me.resources.metal} />
        <ResourceChip kind="energy" value={me.resources.energy} />
      </div>

      <div className="hud-block hud-dominion" title={`Dominion Points — first to ${rules.victoryScore} triggers the final round`}>
        <span className="hud-label">DOMINION</span>
        <span className="hud-big mono" style={{ color: "var(--gold-bright)" }}>
          {me.dominionPoints}
          <span className="hud-dim">/{rules.victoryScore}</span>
        </span>
        <div className="hud-meter hud-meter-gold">
          <div className="hud-meter-fill" style={{ width: `${dpPct}%` }} />
        </div>
      </div>

      <div className="hud-ap" title="Action Points left this turn">
        <span className="hud-label">ACTIONS</span>
        <div className="hud-ap-pips">
          {[0, 1].map((i) => (
            <span key={i} className={`ap-pip ${i < me.actionPoints ? "ap-pip-on" : ""}`} />
          ))}
        </div>
      </div>

      <button className="hud-icon-btn" onClick={toggleMuted} title={muted ? "Unmute" : "Mute"} aria-label="Toggle sound">
        <Icon name={muted ? "mute" : "sound"} size={20} />
      </button>
    </div>
  );
}
