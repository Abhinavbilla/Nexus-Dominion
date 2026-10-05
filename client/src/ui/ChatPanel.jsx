import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import { sendChatMessage } from "../networking/SocketClient.js";
import "./ChatPanel.css";

export default function ChatPanel() {
  const messages = useGameStore((s) => s.chatMessages);
  const playerId = useGameStore((s) => s.playerId);
  const gameState = useGameStore((s) => s.gameState);
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  function colorFor(senderId) {
    return gameState?.players.find((p) => p.id === senderId)?.color || "cyan";
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text);
    setText("");
  }

  return (
    <div className="chat-panel glass-panel">
      <h3 className="font-display chat-panel-title">COMMS</h3>
      <div className="chat-messages scrollbar-thin" ref={listRef}>
        {messages.length === 0 && <p className="text-faint chat-empty">No messages yet.</p>}
        {messages.map((m, i) => (
          <div className="chat-message" key={i}>
            <span className={`chat-sender player-${colorFor(m.playerId)} ${m.playerId === playerId ? "chat-sender-me" : ""}`}>
              {m.name}:
            </span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input
          className="menu-input chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message commanders..."
          maxLength={300}
        />
        <button className="btn" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
