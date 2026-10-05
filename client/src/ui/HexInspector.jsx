import { useGameStore } from "../state/gameStore.js";
import { calculateDefenseStrength } from "@hex-dominion/shared/combat.js";
import { BASE_CONFIG } from "../config.js";
import Icon from "./Icon.jsx";
import { tileUrl } from "./artUrls.js";
import { TERRAIN_INFO, BUILDING_INFO, RESOURCE_META } from "./bits.jsx";
import "./HexInspector.css";

// Side-panel inspector for the hex under the cursor (kept out of the board area on purpose).
// With nothing hovered it doubles as a terrain legend.
export default function HexInspector() {
  const hovered = useGameStore((s) => s.hoveredHex);
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  const cell = hovered ? gameState.board.find((c) => c.q === hovered.q && c.r === hovered.r) : null;

  if (!cell) {
    return (
      <div className="inspector glass-panel">
        <h3 className="panel-title">MAP KEY</h3>
        <p className="inspector-hint">Hover any hex to inspect it.</p>
        <div className="inspector-legend">
          {Object.entries(TERRAIN_INFO).map(([key, t]) => (
            <div className="inspector-legend-row" key={key}>
              <img src={tileUrl(key, 0, 14)} alt="" draggable="false" />
              <div>
                <b>{t.name}</b>
                <span>{t.yield ? `+1 ${RESOURCE_META[t.yield].label} / round` : t.blurb}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const terrain = TERRAIN_INFO[cell.terrain];
  const owner = gameState.players.find((p) => p.id === cell.ownerId);
  const building = cell.building ? BUILDING_INFO[cell.building] : null;
  const defense = cell.ownerId ? calculateDefenseStrength({ targetHex: cell, config: BASE_CONFIG }) : null;
  const yieldMeta = terrain.yield ? RESOURCE_META[terrain.yield] : null;

  return (
    <div className="inspector glass-panel">
      <h3 className="panel-title">INSPECT</h3>
      <div className="inspector-head">
        <img src={tileUrl(cell.terrain, 0, 14)} alt="" draggable="false" />
        <div>
          <div className="inspector-name">{terrain.name}</div>
          <div className="inspector-coord mono">
            hex ({cell.q}, {cell.r})
          </div>
        </div>
        {yieldMeta && (
          <span className="inspector-yield" style={{ color: yieldMeta.color }}>
            <Icon name={yieldMeta.icon} size={18} /> +1
          </span>
        )}
      </div>
      <p className="inspector-blurb">{terrain.blurb}</p>
      <div className="inspector-rows">
        <div>
          <span>Owner</span>
          <b className={owner ? `player-${owner.color}` : "text-faint"}>{owner ? owner.name : "Neutral"}</b>
        </div>
        {building && (
          <div>
            <span>Building</span>
            <b>
              <Icon name={building.icon} size={14} /> {building.name}
            </b>
          </div>
        )}
        {cell.fortificationLevel > 0 && (
          <div>
            <span>Fortified</span>
            <b className="mono">Level {cell.fortificationLevel}</b>
          </div>
        )}
        {defense && (
          <div>
            <span>Defense</span>
            <b className="mono">{defense.total}</b>
          </div>
        )}
      </div>
      {building && <p className="inspector-blurb">{building.blurb}</p>}
    </div>
  );
}
