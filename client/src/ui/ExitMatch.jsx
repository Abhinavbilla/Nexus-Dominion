import { useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../state/gameStore.js";
import { leaveMatch } from "../networking/SocketClient.js";
import "./ExitMatch.css";

// "Exit" in the top bar with a confirmation, so a stray click never ends your match.
export default function ExitMatch() {
  const [open, setOpen] = useState(false);
  const status = useGameStore((s) => s.gameState?.status);
  if (status !== "playing") return null;

  return (
    <>
      <button className="exit-btn" onClick={() => setOpen(true)} title="Leave this match">
        Exit
      </button>
      {open &&
        createPortal(
          <div className="exit-modal" onClick={() => setOpen(false)}>
            <div className="exit-panel glass-panel fade-in-up" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Leave match">
              <h3 className="font-title">LEAVE THE MATCH?</h3>
              <p>
                Your hexes stay on the board and your turns will be skipped. You can't rejoin this match once you leave. If everyone else has left, the
                last player wins.
              </p>
              <div className="exit-actions">
                <button className="btn" onClick={() => setOpen(false)}>
                  Stay in match
                </button>
                <button className="btn btn-danger" onClick={leaveMatch}>
                  Leave match
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
