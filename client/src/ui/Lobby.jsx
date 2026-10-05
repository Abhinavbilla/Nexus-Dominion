import { useGameStore } from "../state/gameStore.js";
import { startGame, leaveRoom } from "../networking/SocketClient.js";
import "./Lobby.css";

const PLAYER_COLORS = ["cyan", "orange", "violet", "lime"];
const MAX_PLAYERS = 4;

export default function Lobby() {
  const roomCode = useGameStore((s) => s.roomCode);
  const playerId = useGameStore((s) => s.playerId);
  const players = useGameStore((s) => s.lobbyPlayers);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);

  const isHost = players[0]?.id === playerId;
  const canStart = isHost && players.length >= 2;
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] || null);

  return (
    <div className="lobby-root">
      <div className="scanline-backdrop" />
      <div className="lobby-panel glass-panel fade-in-up">
        <div className="lobby-header">
          <span className="text-dim">ROOM CODE</span>
          <h1 className="font-display lobby-code">{roomCode}</h1>
          <span className="text-faint">Share this code with up to 3 other commanders</span>
        </div>

        <div className="lobby-slots">
          {slots.map((player, i) => (
            <div className={`lobby-slot ${player ? "lobby-slot-filled" : ""}`} key={i}>
              <span className={`lobby-slot-dot player-${PLAYER_COLORS[i]}`} />
              <div className="lobby-slot-info">
                <span className="lobby-slot-name">{player ? player.name : "Waiting for commander..."}</span>
                {player && <span className="lobby-slot-status text-faint">{player.connected ? "Connected" : "Disconnected"}</span>}
              </div>
              {player?.id === playerId && <span className="lobby-slot-you">YOU</span>}
            </div>
          ))}
        </div>

        <div className="lobby-actions">
          {isHost ? (
            <button className="btn btn-primary" disabled={!canStart} onClick={() => startGame("normal")}>
              {canStart ? "Start Game" : "Need 2+ Players"}
            </button>
          ) : (
            <span className="text-dim">Waiting for the host to start the match...</span>
          )}
          <button className="btn btn-danger" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>

        {error && (
          <div className="lobby-error glass-panel">
            {error}
            <button className="menu-error-dismiss" onClick={clearError}>
              ×
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
