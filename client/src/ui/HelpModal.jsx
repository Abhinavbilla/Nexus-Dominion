import { useEffect } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../state/gameStore.js";
import { GuideContent } from "./HowToPlay.jsx";
import "./HelpModal.css";

// The full illustrated guide, available mid-game without leaving the board (H or ?).
export default function HelpModal() {
  const open = useGameStore((s) => s.helpOpen);
  const setOpen = useGameStore((s) => s.setHelpOpen);

  useEffect(() => {
    function onKey(e) {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "h" || e.key === "H" || e.key === "?") setOpen(!useGameStore.getState().helpOpen);
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  if (!open) return null;
  return createPortal(
    <div className="help-modal" onClick={() => setOpen(false)}>
      <div className="help-modal-panel glass-panel fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="help-modal-head">
          <h2 className="font-title">HOW TO PLAY</h2>
          <button className="btn btn-ghost" onClick={() => setOpen(false)}>
            Close
          </button>
        </div>
        <GuideContent onClose={() => setOpen(false)} compact />
      </div>
    </div>,
    document.body
  );
}
