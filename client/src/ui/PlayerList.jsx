import { useGameStore } from "../state/gameStore.js";
import { rulesOf } from "./rules.js";
import Icon from "./Icon.jsx";
import { PlayerEmblem } from "./bits.jsx";
import { PLAYER_COLOR_NAME } from "../game/playerColors.js";
import "./PlayerList.css";

export default function PlayerList() {
  const gameState = useGameStore((s) => s.gameState);
  const myId = useGameStore((s) => s.playerId);
  if (!gameState) return null;
  const target = rulesOf(gameState).victoryScore;

  const ranked = [...gameState.players].sort((a, b) => b.dominionPoints - a.dominionPoints);
  const leaderId = ranked[0]?.dominionPoints > 0 ? ranked[0].id : null;

  return (
    <div className="player-list glass-panel">
      <h3 className="panel-title">COMMANDERS</h3>
      {gameState.players.map((p, i) => {
        const isCurrent = i === gameState.currentPlayerIndex && gameState.status === "playing";
        const territory = gameState.board.filter((c) => c.ownerId === p.id).length;
        return (
          <div className={`pcard ${isCurrent ? "pcard-active" : ""} ${!p.connected ? "pcard-offline" : ""}`} key={p.id} style={{ "--pc": `var(--player-${p.color})` }}>
            <PlayerEmblem color={p.color} ai={p.isAI} size={40} active={isCurrent} />
            <div className="pcard-main">
              <div className="pcard-top">
                <span className="pcard-name">
                  {p.name}
                  {p.id === myId && <span className="pcard-you">YOU</span>}
                </span>
                {p.id === leaderId && <Icon name="crown" size={15} color="var(--gold)" title="Leading" />}
              </div>
              <div className="pcard-sub">
                {PLAYER_COLOR_NAME[p.color]}
                {!p.connected && " · offline"} · <Icon name="plains" size={11} /> {territory}
              </div>
              <div className="pcard-bar" title={`${p.dominionPoints} / ${target} Dominion`}>
                <div className="pcard-bar-fill" style={{ width: `${Math.min(100, (p.dominionPoints / target) * 100)}%` }} />
              </div>
              <div className="pcard-res mono">
                <span>
                  <Icon name="dominion" size={12} color="var(--gold)" /> {p.dominionPoints}
                </span>
                <span>
                  <Icon name="wood" size={12} color="var(--res-wood)" /> {p.resources.wood}
                </span>
                <span>
                  <Icon name="metal" size={12} color="var(--res-metal)" /> {p.resources.metal}
                </span>
                <span>
                  <Icon name="energy" size={12} color="var(--res-energy)" /> {p.resources.energy}
                </span>
              </div>
            </div>
            {isCurrent && <span className="pcard-turn" />}
          </div>
        );
      })}
    </div>
  );
}
