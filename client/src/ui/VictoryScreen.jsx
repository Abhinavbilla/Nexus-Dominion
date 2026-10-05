import { useEffect, useRef } from "react";
import { useGameStore } from "../state/gameStore.js";
import { leaveMatch, voteRematch } from "../networking/SocketClient.js";
import Backdrop from "./Backdrop.jsx";
import Icon from "./Icon.jsx";
import { PlayerEmblem } from "./bits.jsx";
import { PLAYER_COLOR_CSS } from "../game/playerColors.js";
import "./VictoryScreen.css";

const OUTCOME_TEXT = { won: "VICTORY", lost: "DEFEAT", draw: "STALEMATE" };
const OUTCOME_SUB = { won: "You won the match", lost: "You lost the match", draw: "No single winner" };
const REASON_TEXT = { dominion_threshold: "Dominion threshold reached", round_limit: "Round limit reached", draw: "Perfectly tied", forfeit: "All opponents left the match" };

// Confetti / embers canvas for a win.
function Celebration({ colors }) {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let raf;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    const parts = Array.from({ length: 140 }, () => ({
      x: Math.random() * canvas.width,
      y: -Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.2,
      vy: 1.4 + Math.random() * 2.6,
      s: 4 + Math.random() * 6,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.2,
      c: colors[Math.floor(Math.random() * colors.length)],
    }));
    const tick = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of parts) {
        p.x += p.vx;
        p.y += p.vy;
        p.r += p.vr;
        if (p.y > canvas.height + 20) {
          p.y = -20;
          p.x = Math.random() * canvas.width;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.85;
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
        ctx.restore();
      }
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [colors]);
  return <canvas ref={ref} className="victory-confetti" />;
}

const GOLD_CONFETTI = ["#ffd47a", "#e9b44c", "#fff1c9", "#4c8dff", "#ff6b3d"];

export default function VictoryScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const rematch = useGameStore((s) => s.rematch);
  if (!gameState) return null;

  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  const isDraw = !winner;
  const outcome = isDraw ? "draw" : winner.id === playerId ? "won" : "lost";
  const ranked = [...gameState.players].sort((a, b) => b.dominionPoints - a.dominionPoints);
  const iVoted = rematch.voters.includes(playerId);
  const territory = (id) => gameState.board.filter((c) => c.ownerId === id).length;

  return (
    <Backdrop className="victory-root">
      {outcome === "won" && <Celebration colors={GOLD_CONFETTI} />}
      <div className="victory-wrap">
        <div className={`victory-panel glass-panel victory-${outcome} fade-in-up`}>
          <div className="victory-medal">
            <Icon name={outcome === "won" ? "crown" : outcome === "lost" ? "skull" : "swap"} size={44} />
          </div>
          <div className={`victory-outcome victory-outcome-${outcome} font-title`}>{OUTCOME_TEXT[outcome]}</div>
          <div className="victory-sub">{OUTCOME_SUB[outcome]}</div>

          {!isDraw && (
            <div className="victory-winner-block">
              <PlayerEmblem color={winner.color} name={winner.name} ai={winner.isAI} size={52} active />
              <div>
                <span className="text-faint victory-label">WINNER</span>
                <h2 className={`victory-winner player-${winner.color}`}>{winner.name}</h2>
              </div>
              <span className="victory-score mono">
                <Icon name="dominion" size={18} color="var(--gold)" /> {winner.dominionPoints}
              </span>
            </div>
          )}
          <div className="victory-reason">{REASON_TEXT[gameState.winReason] || ""}</div>

          <div className="victory-table">
            <div className="victory-row victory-row-head">
              <span />
              <span>Commander</span>
              <span title="Dominion">DP</span>
              <span title="Hexes owned">Hexes</span>
              <span title="Supply Chains completed">Chains</span>
              <span title="Successful / launched attacks">Attacks</span>
              <span title="Buildings built">Built</span>
            </div>
            {ranked.map((p, i) => (
              <div className={`victory-row ${p.id === playerId ? "victory-row-me" : ""}`} key={p.id} style={{ "--pc": PLAYER_COLOR_CSS[p.color] }}>
                <span className="victory-rank mono">{i + 1}</span>
                <span className="victory-name">
                  <i style={{ background: PLAYER_COLOR_CSS[p.color] }} />
                  {p.name}
                </span>
                <span className="mono victory-dp">{p.dominionPoints}</span>
                <span className="mono">{territory(p.id)}</span>
                <span className="mono">{p.stats.chainsCompleted}</span>
                <span className="mono">
                  {p.stats.attacksSucceeded}/{p.stats.attacksLaunched}
                </span>
                <span className="mono">{p.stats.buildingsBuilt}</span>
              </div>
            ))}
          </div>

          <div className="victory-actions">
            {rematch.canRematch ? (
              <button className="btn btn-primary victory-cta" disabled={iVoted} onClick={voteRematch}>
                {iVoted ? `Waiting for others (${rematch.voters.length}/${rematch.needed.length})` : "Rematch"}
              </button>
            ) : (
              <span className="text-faint victory-norematch">No opponents left for a rematch</span>
            )}
            <button className="btn btn-ghost" onClick={leaveMatch}>
              Return to Main Menu
            </button>
          </div>
          {rematch.canRematch && rematch.needed.length > 1 && (
            <div className="victory-votes">
              {gameState.players
                .filter((p) => rematch.needed.includes(p.id))
                .map((p) => (
                  <span key={p.id} className={rematch.voters.includes(p.id) ? "voted" : ""}>
                    {p.name}
                  </span>
                ))}
            </div>
          )}
        </div>
      </div>
    </Backdrop>
  );
}
