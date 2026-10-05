import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import { createRoom, joinRoom } from "../networking/SocketClient.js";
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
    <div className="menu-root">
      <div className="scanline-backdrop" />
      <div className="menu-hex-glow" />

      <div className="menu-content fade-in-up">
        <div className="menu-title-block">
          <h1 className="menu-title font-display">
            NEXUS<span className="menu-title-colon">:</span>
            <br />
            <span className="menu-title-sub">DOMINION</span>
          </h1>
          <p className="menu-tagline text-dim">TERRITORIAL COMMAND · TACTICAL SUPREMACY</p>
        </div>

        {mode === "root" && (
          <div className="menu-panel glass-panel fade-in-up">
            <label className="menu-label">Commander Name</label>
            <input
              className="menu-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              maxLength={16}
            />
            <div className="menu-actions">
              <button className="btn btn-primary" onClick={() => setMode("create")}>
                Create Room
              </button>
              <button className="btn" onClick={() => setMode("join")}>
                Join Room
              </button>
              <button className="btn" onClick={() => setMode("howto")}>
                How To Play
              </button>
            </div>
          </div>
        )}

        {mode === "create" && (
          <form className="menu-panel glass-panel fade-in-up" onSubmit={handleCreate}>
            <p className="text-dim">A new room will be created with a shareable code.</p>
            <div className="menu-actions">
              <button type="submit" className="btn btn-primary">
                Create & Enter Lobby
              </button>
              <button type="button" className="btn" onClick={() => setMode("root")}>
                Back
              </button>
            </div>
          </form>
        )}

        {mode === "join" && (
          <form className="menu-panel glass-panel fade-in-up" onSubmit={handleJoin}>
            <label className="menu-label">Room Code</label>
            <input
              className="menu-input menu-input-code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="X7K92"
              maxLength={5}
            />
            <div className="menu-actions">
              <button type="submit" className="btn btn-primary" disabled={roomCode.length < 5}>
                Join Room
              </button>
              <button type="button" className="btn" onClick={() => setMode("root")}>
                Back
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="menu-error glass-panel">
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
