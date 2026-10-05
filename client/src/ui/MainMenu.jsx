import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import { createRoom, joinRoom } from "../networking/SocketClient.js";
import Backdrop from "./Backdrop.jsx";
import Logo from "./Logo.jsx";
import HeroTiles from "./HeroTiles.jsx";
import Icon from "./Icon.jsx";
import HowToPlay from "./HowToPlay.jsx";
import "./MainMenu.css";

export default function MainMenu() {
  const [mode, setMode] = useState("root"); // root | create | join | howto
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const error = useGameStore((s) => s.error);
  const clearError = useGameStore((s) => s.clearError);

  if (mode === "howto") return <HowToPlay onBack={() => setMode("root")} />;

  function handleCreate(e) {
    e.preventDefault();
    clearError();
    createRoom(name.trim() || "Commander");
  }

  function handleJoin(e) {
    e.preventDefault();
    clearError();
    joinRoom(roomCode.trim().toUpperCase(), name.trim() || "Commander");
  }

  return (
    <Backdrop className="menu-root">
      <div className="menu-layout">
        <div className="menu-left fade-in-up">
          <Logo />
          <p className="menu-tagline">Seize the board. Link your supply lines. Rule the Nexus.</p>

          {mode === "root" && (
            <div className="menu-panel glass-panel">
              <label className="menu-label" htmlFor="cmd-name">
                Commander name
              </label>
              <input id="cmd-name" className="menu-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your name" maxLength={16} />
              <div className="menu-actions">
                <button className="btn btn-primary menu-cta" onClick={() => setMode("create")}>
                  <Icon name="plus" size={16} /> Create Room
                </button>
                <button className="btn" onClick={() => setMode("join")}>
                  <Icon name="swap" size={16} /> Join Room
                </button>
                <button className="btn btn-ghost" onClick={() => setMode("howto")}>
                  <Icon name="info" size={16} /> How To Play
                </button>
              </div>
            </div>
          )}

          {mode === "create" && (
            <form className="menu-panel glass-panel" onSubmit={handleCreate}>
              <p className="text-dim menu-note">A private room with a shareable code. You can add AI opponents in the lobby.</p>
              <div className="menu-actions">
                <button type="submit" className="btn btn-primary menu-cta">
                  Create & Enter Lobby
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode("root")}>
                  Back
                </button>
              </div>
            </form>
          )}

          {mode === "join" && (
            <form className="menu-panel glass-panel" onSubmit={handleJoin}>
              <label className="menu-label" htmlFor="room-code">
                Room code
              </label>
              <input id="room-code" className="menu-input menu-input-code" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} placeholder="X7K92" maxLength={5} />
              <div className="menu-actions">
                <button type="submit" className="btn btn-primary menu-cta" disabled={roomCode.length < 5}>
                  Join Room
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => setMode("root")}>
                  Back
                </button>
              </div>
            </form>
          )}

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

        <div className="menu-right">
          <HeroTiles />
        </div>
      </div>
      <div className="menu-foot">2–4 players · AI opponents · ~10 min matches</div>
    </Backdrop>
  );
}
