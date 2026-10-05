import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import EventLog from "./EventLog.jsx";
import ChatPanel from "./ChatPanel.jsx";
import Icon from "./Icon.jsx";
import "./SideTabs.css";

// Chronicle (what happened) and Comms (chat) share one panel so the sidebar never needs to scroll.
export default function SideTabs() {
  const [tab, setTab] = useState("log");
  const chatCount = useGameStore((s) => s.chatMessages.length);
  const seen = useRef(0);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (tab === "chat") {
      seen.current = chatCount;
      setUnread(0);
    } else {
      setUnread(Math.max(0, chatCount - seen.current));
    }
  }, [chatCount, tab]);

  return (
    <div className="sidetabs glass-panel">
      <div className="sidetabs-head" role="tablist">
        <button role="tab" aria-selected={tab === "log"} className={`sidetab ${tab === "log" ? "sidetab-on" : ""}`} onClick={() => setTab("log")}>
          <Icon name="book" size={15} /> Chronicle
        </button>
        <button role="tab" aria-selected={tab === "chat"} className={`sidetab ${tab === "chat" ? "sidetab-on" : ""}`} onClick={() => setTab("chat")}>
          <Icon name="chat" size={15} /> Comms
          {unread > 0 && <span className="sidetab-badge mono">{unread}</span>}
        </button>
      </div>
      <div className="sidetabs-body">{tab === "log" ? <EventLog /> : <ChatPanel />}</div>
    </div>
  );
}
