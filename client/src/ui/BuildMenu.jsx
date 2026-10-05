import { useMemo } from "react";
import { useGameStore, getMyPlayer } from "../state/gameStore.js";
import { BASE_CONFIG } from "../config.js";
import { buildingDataUrl } from "../game/art/buildingArt.js";
import { PLAYER_COLOR_CSS } from "../game/playerColors.js";
import { CostChips } from "./bits.jsx";
import "./BuildMenu.css";

const BUILDINGS = [
  { type: "factory", label: "Factory", effect: "Doubles a resource hex's output and powers a Supply Chain." },
  { type: "fortress", label: "Fortress", effect: "+3 Defense Strength on this hex." },
  { type: "city", label: "City", effect: "+3 Dominion now. Supply Chain endpoint." },
];

function canAfford(me, cost) {
  if (!me) return false;
  return ["wood", "metal", "energy"].every((k) => !cost[k] || me.resources[k] >= cost[k]);
}

export default function BuildMenu() {
  const actionMode = useGameStore((s) => s.actionMode);
  const pendingBuildType = useGameStore((s) => s.pendingBuildType);
  const setPendingBuildType = useGameStore((s) => s.setPendingBuildType);
  const me = getMyPlayer();
  const color = PLAYER_COLOR_CSS[me?.color] || "#4c8dff";
  const art = useMemo(() => Object.fromEntries(BUILDINGS.map((b) => [b.type, buildingDataUrl(b.type, color, 22)])), [color]);

  if (actionMode !== "build") return null;

  return (
    <div className="build-menu glass-panel fade-in-up">
      <h3 className="panel-title">BUILD</h3>
      <p className="text-faint build-menu-hint">Pick a structure, then click a glowing hex.</p>
      {BUILDINGS.map((b) => {
        const cost = BASE_CONFIG.BUILD_COSTS[b.type];
        const affordable = canAfford(me, cost);
        const active = pendingBuildType === b.type;
        return (
          <button key={b.type} className={`build-card ${active ? "build-card-active" : ""}`} disabled={!affordable} onClick={() => setPendingBuildType(b.type)}>
            <span className="build-card-art">
              <img src={art[b.type]} alt="" draggable="false" />
            </span>
            <span className="build-card-body">
              <span className="build-card-name">{b.label}</span>
              <span className="build-card-effect">{b.effect}</span>
              <CostChips cost={cost} have={me?.resources} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
