import { useState } from "react";
import { useGameStore } from "../state/gameStore.js";
import "./AIExplanation.css";

const FEATURE_LABELS = {
  victory: "Immediate victory",
  dominionGain: "Dominion gain",
  resourceGain: "Income gain",
  chainCompletion: "Supply Chain progress",
  chainDisruption: "Chain disruption",
  defensiveValue: "Defensive value",
  threatProximity: "Enemy proximity",
  expansionValue: "Expansion value",
  denyLeader: "Deny leader",
  captureSwing: "Territory swing",
  resourceCost: "Resource cost",
};

const fmt = (n) => (Math.round(n * 1000) / 1000).toString();

// "WHY THIS MOVE?" (spec.md §52). Renders the exact feature table the AI
// computed server-side — nothing here is generated or inferred client-side.
export default function AIExplanation() {
  const entries = useGameStore((s) => s.aiExplanations);
  const gameState = useGameStore((s) => s.gameState);
  const [open, setOpen] = useState(false);
  const last = entries[entries.length - 1];
  if (!last || !gameState) return null;

  const aiPlayer = gameState.players.find((p) => p.id === last.playerId);
  const { explanation } = last;

  return (
    <div className="ai-explain glass-panel">
      <h3 className="font-display ai-explain-title">AI ACTION</h3>
      <span>
        {aiPlayer?.name}: {explanation.summary}
      </span>
      <button className="btn ai-explain-toggle" onClick={() => setOpen(!open)}>
        {open ? "Hide" : "WHY THIS MOVE?"}
      </button>
      {open && (
        <>
          {explanation.features?.length > 0 ? (
            <table className="ai-explain-table">
              <tbody>
                {explanation.features.map((f) => (
                  <tr key={f.name}>
                    <td>
                      {FEATURE_LABELS[f.name] || f.name} <span className="text-faint">({fmt(f.value)} × {fmt(f.weight)})</span>
                    </td>
                    <td>{f.contribution >= 0 ? "+" : ""}{fmt(f.contribution)}</td>
                  </tr>
                ))}
                <tr className="ai-explain-total">
                  <td>Total</td>
                  <td>{fmt(explanation.total)}</td>
                </tr>
              </tbody>
            </table>
          ) : (
            <span className="text-faint">This AI type does not use a weighted heuristic.</span>
          )}
          {explanation.alternatives?.length > 0 && (
            <div className="ai-explain-alt text-faint">
              Runner-ups: {explanation.alternatives.map((a) => `${a.label} (${fmt(a.total)})`).join(", ")}
            </div>
          )}
        </>
      )}
    </div>
  );
}
