import { useEffect, useRef } from "react";
import { useGameStore } from "../state/gameStore.js";
import Icon from "./Icon.jsx";
import "./EventLog.css";

function Who({ gameState, id }) {
  const p = gameState.players.find((x) => x.id === id);
  return <b className={`player-${p?.color}`}>{p?.name ?? "Unknown"}</b>;
}

const hex = (h) => `(${h.q}, ${h.r})`;

// One log line: [icon] rich text. Returns null for events not worth showing.
function describe(gs, e) {
  const kind = e.action || e.type;
  switch (kind) {
    case "claim":
      return { icon: "claim", color: "#ffd47a", body: <><Who gameState={gs} id={e.playerId} /> claimed {hex(e.hex)} <em>+{e.dominionAwarded} DP</em></> };
    case "build":
      return { icon: e.buildingType, color: "#4cc9b0", body: <><Who gameState={gs} id={e.playerId} /> built a {e.buildingType} at {hex(e.hex)}{e.dominionAwarded ? <em> +{e.dominionAwarded} DP</em> : null}</> };
    case "attack": {
      const win = e.outcome === "SUCCESS";
      return { icon: "attack", color: win ? "#ff6a6a" : "#8cc4ff", body: <><Who gameState={gs} id={e.playerId} /> attacked <Who gameState={gs} id={e.defenderId} /> at {hex(e.hex)} — <strong className={win ? "ev-win" : "ev-lose"}>{win ? "captured" : "repelled"}</strong>{e.dominionAwarded ? <em> +{e.dominionAwarded} DP</em> : null}</> };
    }
    case "fortify":
      return { icon: "fortify", color: "#5aa9ff", body: <><Who gameState={gs} id={e.playerId} /> fortified {hex(e.hex)} to level {e.newLevel}</> };
    case "turn_started":
      return { icon: "endturn", color: "#66728f", dim: true, body: <><Who gameState={gs} id={e.playerId} />'s turn</> };
    case "turn_ended":
      return null;
    case "player_left":
      return { icon: "endturn", color: "#ee5a5a", body: <><Who gameState={gs} id={e.playerId} /> left the match</> };
    case "player_kicked":
      return { icon: "endturn", color: "#ee5a5a", body: <><Who gameState={gs} id={e.playerId} /> was removed by the host</> };
    case "chain_income":
      return { icon: "chain", color: "#ffd47a", body: <><Who gameState={gs} id={e.playerId} /> earns <em>+{e.amount} DP</em> from {e.chains} Supply Chain{e.chains > 1 ? "s" : ""}</> };
    case "round_started":
      return { icon: "timer", color: "#a3aec8", body: <strong>Round {e.round} begins</strong> };
    case "match_started":
      return { icon: "crown", color: "#e9b44c", body: <strong>The match begins</strong> };
    case "game_over":
      return { icon: "crown", color: "#ffd47a", body: e.winnerId ? <><Who gameState={gs} id={e.winnerId} /> wins the match!</> : <strong>The match ends in a draw</strong> };
    default:
      return null;
  }
}

export default function EventLog() {
  const gameState = useGameStore((s) => s.gameState);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [gameState?.eventLog?.length]);

  if (!gameState) return null;
  const events = gameState.eventLog.slice(-60);

  return (
    <div className="event-log glass-panel">
      <h3 className="panel-title">CHRONICLE</h3>
      <div className="event-log-list scrollbar-thin" ref={listRef}>
        {events.map((e, i) => {
          const d = describe(gameState, e);
          if (!d) return null;
          return (
            <div className={`ev ${d.dim ? "ev-dim" : ""}`} key={i}>
              <span className="ev-round mono">R{e.round}</span>
              <Icon name={d.icon} size={14} color={d.color} />
              <span className="ev-body">{d.body}</span>
              {e.chainUpdate?.dominionEvents?.length > 0 && (
                <span className="ev-chain">
                  <Icon name="chain" size={13} color="var(--gold-bright)" /> Supply Chain complete <em>+{e.chainUpdate.dominionEvents.reduce((s, d2) => s + d2.amount, 0)} DP</em>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
