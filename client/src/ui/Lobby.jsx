import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import { startGame, leaveRoom, addAI, removeAI } from "../networking/SocketClient.js";
import Backdrop from "./Backdrop.jsx";
import Logo from "./Logo.jsx";
import Icon from "./Icon.jsx";
import { PlayerEmblem } from "./bits.jsx";
import { PLAYER_COLOR_NAME } from "../game/playerColors.js";
import "./Lobby.css";

const PLAYER_COLORS = ["cyan", "orange", "violet", "lime"];
const MAX_PLAYERS = 4;
const AI_TYPES = [
  { type: "random", label: "Random", blurb: "Chaotic. Great for learning." },
  { type: "greedy", label: "Greedy", blurb: "Grabs points fast, attacks often." },
  { type: "strategic", label: "Strategic", blurb: "Plans Supply Chains. Tough." },
];

export default function Lobby() {
  const roomCode = useGameStore((s) => s.roomCode);
  const playerId = useGameStore((s) => s.playerId);
  const players = useGameStore((s) => s.lobbyPlayers);
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);
  const [copied, setCopied] = useState(false);

  const isHost = players[0]?.id === playerId;
  const canStart = isHost && players.length >= 2;
  const slots = Array.from({ length: MAX_PLAYERS }, (_, i) => players[i] || null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <Backdrop className="lobby-root">
      <div className="lobby-wrap">
        <div className="lobby-panel glass-panel fade-in-up">
          <div className="lobby-top">
            <Logo size="sm" />
          </div>

          <div className="lobby-header">
            <span className="lobby-kicker">ROOM CODE</span>
            <button className="lobby-code-btn" onClick={copy} title="Copy room code">
              <h1 className="lobby-code font-title">{roomCode}</h1>
              <span className="lobby-copy">{copied ? "Copied!" : "Click to copy"}</span>
            </button>
            <span className="text-faint">Share this code with up to 3 other commanders</span>
          </div>

          <div className="lobby-slots">
            {slots.map((player, i) => (
              <div className={`lobby-slot ${player ? "lobby-slot-filled" : ""}`} key={i} style={{ "--pc": `var(--player-${PLAYER_COLORS[i]})` }}>
                {player ? <PlayerEmblem color={PLAYER_COLORS[i]} ai={player.isAI} size={42} active /> : <span className="lobby-slot-empty-emblem" />}
                <div className="lobby-slot-info">
                  <span className="lobby-slot-name">{player ? player.name : "Open seat"}</span>
                  <span className="lobby-slot-status">
                    {PLAYER_COLOR_NAME[PLAYER_COLORS[i]]} · {player ? (player.isAI ? "AI opponent" : player.connected ? "Connected" : "Disconnected") : "waiting…"}
                  </span>
                </div>
                {player?.id === playerId && <span className="lobby-slot-you">YOU</span>}
                {i === 0 && <Icon name="crown" size={16} color="var(--gold)" title="Host" />}
                {player?.isAI && isHost && (
                  <button className="lobby-ai-remove" onClick={() => removeAI(player.id)} aria-label="Remove AI">
                    <Icon name="close" size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {isHost && players.length < MAX_PLAYERS && (
            <div className="lobby-ai">
              <span className="lobby-ai-title">
                <Icon name="bot" size={14} /> ADD AI OPPONENT
              </span>
              <div className="lobby-ai-grid">
                {AI_TYPES.map((a) => (
                  <button className="lobby-ai-card" key={a.type} onClick={() => addAI(a.type)}>
                    <b>{a.label}</b>
                    <span>{a.blurb}</span>
                    <span className="sr-only">{a.type}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="lobby-actions">
            {isHost ? (
              <button className="btn btn-primary lobby-start" disabled={!canStart} onClick={() => startGame("normal")}>
                {canStart ? "Start Game" : "Need 2+ Players"}
              </button>
            ) : (
              <span className="text-dim">Waiting for the host to start the match…</span>
            )}
            <button className="btn btn-danger" onClick={leaveRoom}>
              Leave Room
            </button>
          </div>

          {error && (
            <div className="menu-error">
              <Icon name="info" size={16} />
              <span>{error}</span>
              <button className="menu-error-dismiss" onClick={clearError} aria-label="Dismiss">
                <Icon name="close" size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </Backdrop>
  );
}
