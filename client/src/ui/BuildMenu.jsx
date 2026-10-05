import { useGameStore, getMyPlayer } from "../state/gameStore.js";
import { BASE_CONFIG } from "../config.js";
import "./BuildMenu.css";

const BUILDINGS = [
  { type: "factory", label: "Factory", effect: "+1 resource production (local)" },
  { type: "fortress", label: "Fortress", effect: "+3 Defense Strength" },
  { type: "city", label: "City", effect: "+3 Dominion · Supply Chain endpoint" },
];

function formatCost(cost) {
  const parts = [];
  if (cost.wood) parts.push(`${cost.wood} Wood`);
  if (cost.metal) parts.push(`${cost.metal} Metal`);
  if (cost.energy) parts.push(`${cost.energy} Energy`);
  return parts.join(" · ");
}

function canAfford(me, cost) {
  if (!me) return false;
  return (!cost.wood || me.resources.wood >= cost.wood) &&
    (!cost.metal || me.resources.metal >= cost.metal) &&
    (!cost.energy || me.resources.energy >= cost.energy);
}

export default function BuildMenu() {
  const actionMode = useGameStore((s) => s.actionMode);
  const pendingBuildType = useGameStore((s) => s.pendingBuildType);
  const setPendingBuildType = useGameStore((s) => s.setPendingBuildType);
  const me = getMyPlayer();

  if (actionMode !== "build") return null;

  return (
    <div className="build-menu glass-panel fade-in-up">
      <h3 className="font-display build-menu-title">BUILD</h3>
      <p className="text-faint build-menu-hint">Choose a structure, then click a target hex.</p>
      {BUILDINGS.map((b) => {
        const cost = BASE_CONFIG.BUILD_COSTS[b.type];
        const affordable = canAfford(me, cost);
        return (
          <button
            key={b.type}
            className={`build-option ${pendingBuildType === b.type ? "build-option-active" : ""}`}
            disabled={!affordable}
            onClick={() => setPendingBuildType(b.type)}
          >
            <div className="build-option-row">
              <span className="build-option-label">{b.label}</span>
              <span className="text-faint">{formatCost(cost)}</span>
            </div>
            <span className="text-dim build-option-effect">{b.effect}</span>
            {!affordable && <span className="build-option-error">Insufficient resources</span>}
          </button>
        );
      })}
      {pendingBuildType && <p className="text-dim build-menu-prompt">Click a valid owned hex to build {pendingBuildType}.</p>}
    </div>
  );
}
