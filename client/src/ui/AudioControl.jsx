import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import { playSfx } from "../audio/AudioManager.js";
import Icon from "./Icon.jsx";
import "./AudioControl.css";

// Speaker button + small settings panel (sound on/off, volume, test sound). The choice is remembered
// between visits. `floating` pins it to the top-right corner for screens without the game HUD.
export default function AudioControl({ floating = false }) {
  const muted = useGameStore((s) => s.muted);
  const volume = useGameStore((s) => s.volume);
  const toggleMuted = useGameStore((s) => s.toggleMuted);
  const setVolume = useGameStore((s) => s.setVolume);
  const [open, setOpen] = useState(false);
  const root = useRef(null);

  // close when clicking elsewhere; M toggles sound from anywhere
  useEffect(() => {
    function onDown(e) {
      if (root.current && !root.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      const tag = e.target?.tagName;
      if (tag === "INPUT" && e.target.type !== "range") return;
      if (tag === "TEXTAREA" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "m" || e.key === "M") toggleMuted();
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [toggleMuted]);

  const level = Math.round(volume * 100);
  const silent = muted || volume === 0;

  return (
    <div className={`audio ${floating ? "audio-floating" : ""}`} ref={root}>
      <button className="hud-icon-btn audio-btn" onClick={() => setOpen(!open)} title="Sound settings (M to mute)" aria-label="Sound settings" aria-expanded={open}>
        <Icon name={silent ? "mute" : "sound"} size={20} />
      </button>

      {open && (
        <div className="audio-panel" role="dialog" aria-label="Sound settings">
          <div className="audio-row">
            <span>Sound effects</span>
            <button className={`audio-switch ${muted ? "" : "audio-switch-on"}`} onClick={toggleMuted} role="switch" aria-checked={!muted}>
              {muted ? "Off" : "On"}
            </button>
          </div>
          <div className="audio-row audio-row-slider">
            <label htmlFor="audio-volume">Volume</label>
            <input
              id="audio-volume"
              type="range"
              min="0"
              max="100"
              step="5"
              value={level}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              onPointerUp={() => playSfx("claim")}
              disabled={muted}
              style={{ "--fill": `${level}%` }}
            />
            <span className="mono audio-level">{level}%</span>
          </div>
          <button className="btn audio-test" onClick={() => playSfx("chain")} disabled={muted}>
            Play test sound
          </button>
          <span className="audio-hint">Press M to mute or unmute</span>
        </div>
      )}
    </div>
  );
}
