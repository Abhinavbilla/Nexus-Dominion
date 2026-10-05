import { useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "../state/gameStore.js";
import { PlayerEmblem } from "./bits.jsx";
import "./AIExplanation.css";

const FEATURE_LABELS = {
  victory: "Winning move",
  dominionGain: "Dominion gain",
  resourceGain: "Income gain",
  chainCompletion: "Supply Chain progress",
  chainDisruption: "Chain disruption",
  defensiveValue: "Defensive value",
  threatProximity: "Enemy proximity",
  expansionValue: "Expansion value",
  denyLeader: "Deny the leader",
  captureSwing: "Territory swing",
  resourceCost: "Resource cost",
};

const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

// Compact "last AI move" card; the full score breakdown opens as a modal so it never takes
// board or sidebar space (spec.md §52 — the table is the AI's real calculation, not a story).
export default function AIExplanation() {
  const entries = useGameStore((s) => s.aiExplanations);
  const gameState = useGameStore((s) => s.gameState);
  const [open, setOpen] = useState(false);
  const last = entries[entries.length - 1];
  if (!last || !gameState) return null;

  const aiPlayer = gameState.players.find((p) => p.id === last.playerId);
  const { explanation } = last;
  const maxAbs = Math.max(1, ...(explanation.features || []).map((f) => Math.abs(f.contribution)));

  return (
    <>
      <div className="ai-card glass-panel">
        <PlayerEmblem color={aiPlayer?.color} name={aiPlayer?.name} ai size={32} />
        <div className="ai-card-text">
          <b className={`player-${aiPlayer?.color}`}>{aiPlayer?.name}</b>
          <span>{explanation.summary}</span>
        </div>
        <button className="btn ai-card-btn" onClick={() => setOpen(true)}>
          Why?
        </button>
      </div>

      {open &&
        createPortal(
          <div className="ai-modal" onClick={() => setOpen(false)}>
            <div className="ai-modal-panel glass-panel fade-in-up" onClick={(e) => e.stopPropagation()}>
              <div className="ai-modal-head">
                <h3 className="panel-title">
                  WHY THIS MOVE?
                </h3>
                <button className="btn btn-ghost" onClick={() => setOpen(false)}>
                  Close
                </button>
              </div>
              <div className="ai-explain-line">
                <b className={`player-${aiPlayer?.color}`}>{aiPlayer?.name}</b>
                <span className="text-dim">{explanation.summary}</span>
              </div>
              {explanation.features?.length > 0 ? (
                <div className="ai-feats">
                  {explanation.features.map((f) => (
                    <div className="ai-feat" key={f.name}>
                      <div className="ai-feat-top">
                        <span>{FEATURE_LABELS[f.name] || f.name}</span>
                        <span className="ai-feat-calc mono">
                          {fmt(f.value)} × {fmt(f.weight)}
                        </span>
                        <b className={`mono ${f.contribution >= 0 ? "pos" : "neg"}`}>
                          {f.contribution >= 0 ? "+" : ""}
                          {fmt(f.contribution)}
                        </b>
                      </div>
                      <div className="ai-feat-bar">
                        <div className={`ai-feat-fill ${f.contribution >= 0 ? "pos" : "neg"}`} style={{ width: `${(Math.abs(f.contribution) / maxAbs) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="ai-total">
                    <span>TOTAL SCORE</span>
                    <b className="mono">{fmt(explanation.total)}</b>
                  </div>
                </div>
              ) : (
                <span className="text-faint">This AI type does not use a weighted heuristic.</span>
              )}
              {explanation.alternatives?.length > 0 && (
                <div className="ai-explain-alt text-faint">Runner-ups: {explanation.alternatives.map((a) => `${a.label} (${fmt(a.total)})`).join(", ")}</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
