import { useGameStore } from "../state/gameStore.js";
import { calculateDefenseStrength } from "@hex-dominion/shared/combat.js";
import { BASE_CONFIG } from "../config.js";
import Icon from "./Icon.jsx";
import { TERRAIN_INFO, BUILDING_INFO, RESOURCE_META } from "./bits.jsx";
import "./HexTooltip.css";

// Floating inspector for the hex under the cursor: terrain, yield, owner, building, defense.
export default function HexTooltip() {
  const hovered = useGameStore((s) => s.hoveredHex);
  const gameState = useGameStore((s) => s.gameState);
  if (!hovered || !gameState) return null;

  const cell = gameState.board.find((c) => c.q === hovered.q && c.r === hovered.r);
  if (!cell) return null;

  const terrain = TERRAIN_INFO[cell.terrain];
  const owner = gameState.players.find((p) => p.id === cell.ownerId);
  const building = cell.building ? BUILDING_INFO[cell.building] : null;
  const defense = cell.ownerId ? calculateDefenseStrength({ targetHex: cell, config: BASE_CONFIG }) : null;
  const yieldMeta = terrain.yield ? RESOURCE_META[terrain.yield] : null;

  return (
    <div className="hex-tip glass-panel">
      <div className="hex-tip-head">
        <span className="hex-tip-icon" style={{ color: terrain.color }}>
          <Icon name={terrain.icon} size={22} />
        </span>
        <div>
          <div className="hex-tip-name">{terrain.name}</div>
          <div className="hex-tip-coord mono">
            ({cell.q}, {cell.r})
          </div>
        </div>
        {yieldMeta && (
          <span className="hex-tip-yield" style={{ color: yieldMeta.color }}>
            <Icon name={yieldMeta.icon} size={15} /> +1
          </span>
        )}
      </div>
      <p className="hex-tip-blurb">{terrain.blurb}</p>

      <div className="hex-tip-rows">
        <div className="hex-tip-row">
          <span>Owner</span>
          <b className={owner ? `player-${owner.color}` : "text-faint"}>{owner ? owner.name : "Neutral"}</b>
        </div>
        {building && (
          <div className="hex-tip-row">
            <span>Building</span>
            <b>
              <Icon name={building.icon} size={13} /> {building.name}
            </b>
          </div>
        )}
        {cell.fortificationLevel > 0 && (
          <div className="hex-tip-row">
            <span>Fortified</span>
            <b className="mono">Lv {cell.fortificationLevel}</b>
          </div>
        )}
        {defense && (
          <div className="hex-tip-row">
            <span>Defense</span>
            <b className="mono">{defense.total}</b>
          </div>
        )}
      </div>
    </div>
  );
}
