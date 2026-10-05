import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import { sendChatMessage } from "../networking/SocketClient.js";
import Icon from "./Icon.jsx";
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

  const colorFor = (senderId) => gameState?.players.find((p) => p.id === senderId)?.color || "cyan";

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim()) return;
    sendChatMessage(text);
    setText("");
  }

  return (
    <div className="chat-panel glass-panel">
      <h3 className="panel-title">COMMS</h3>
      <div className="chat-messages scrollbar-thin" ref={listRef}>
        {messages.length === 0 && <p className="text-faint chat-empty">No transmissions yet.</p>}
        {messages.map((m, i) => (
          <div className={`chat-message ${m.playerId === playerId ? "chat-message-me" : ""}`} key={i}>
            <span className={`chat-sender player-${colorFor(m.playerId)}`}>{m.name}</span>
            <span className="chat-text">{m.text}</span>
          </div>
        ))}
      </div>
      <form className="chat-input-row" onSubmit={handleSubmit}>
        <input className="chat-input" value={text} onChange={(e) => setText(e.target.value)} placeholder="Message commanders…" maxLength={300} />
        <button className="btn chat-send" type="submit" aria-label="Send">
          <Icon name="chat" size={16} />
        </button>
      </form>
    </div>
  );
}
