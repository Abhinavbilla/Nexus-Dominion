import { useEffect, useRef } from "react";
import { useGameStore } from "../state/gameStore.js";
import "./EventLog.css";

function playerName(gameState, playerId) {
  return gameState.players.find((p) => p.id === playerId)?.name ?? "Unknown";
}

function formatEvent(gameState, event) {
  const name = event.playerId ? playerName(gameState, event.playerId) : null;
  switch (event.action || event.type) {
    case "claim":
      return `${name} claimed (${event.hex.q}, ${event.hex.r}) +${event.dominionAwarded} DP`;
    case "build":
      return `${name} built a ${event.buildingType} at (${event.hex.q}, ${event.hex.r})${event.dominionAwarded ? ` +${event.dominionAwarded} DP` : ""}`;
    case "attack": {
      const defender = event.defenderId ? playerName(gameState, event.defenderId) : "neutral";
      return `${name} attacked ${defender} at (${event.hex.q}, ${event.hex.r}) — ${event.outcome}${event.dominionAwarded ? ` +${event.dominionAwarded} DP` : ""}`;
    }
    case "fortify":
      return `${name} fortified (${event.hex.q}, ${event.hex.r}) to level ${event.newLevel}`;
    case "turn_started":
      return `${name}'s turn begins`;
    case "turn_ended":
      return `${name}'s turn ended${event.reason === "timeout" ? " (timeout)" : ""}`;
    case "round_started":
      return `Round ${event.round} begins`;
    case "match_started":
      return "The match has begun";
    case "game_over":
      return event.winnerId ? `${playerName(gameState, event.winnerId)} wins!` : "The match ended in a draw";
    default:
      return JSON.stringify(event);
  }
}

export default function EventLog() {
  const gameState = useGameStore((s) => s.gameState);
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [gameState?.eventLog?.length]);

  if (!gameState) return null;
  const events = gameState.eventLog.slice(-40);

  return (
    <div className="event-log glass-panel">
      <h3 className="font-display event-log-title">EVENT LOG</h3>
      <div className="event-log-list scrollbar-thin" ref={listRef}>
        {events.map((e, i) => (
          <div className="event-log-entry" key={i}>
            <span className="text-faint">R{e.round}</span> {formatEvent(gameState, e)}
            {e.chainUpdate?.dominionEvents?.length > 0 &&
              e.chainUpdate.dominionEvents.map((d, j) => (
                <div className="event-log-sub text-dim" key={j}>
                  ↳ Supply Chain completed at {d.sourceKey} +{d.amount} DP
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}
