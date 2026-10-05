import { useEffect, useRef, useState } from "react";
import Icon from "./Icon.jsx";
import { PLAYER_COLOR_CSS } from "../game/playerColors.js";
import "./bits.css";

export const RESOURCE_META = {
  wood: { icon: "wood", label: "Wood", color: "var(--res-wood)" },
  metal: { icon: "metal", label: "Metal", color: "var(--res-metal)" },
  energy: { icon: "energy", label: "Energy", color: "var(--res-energy)" },
};

// "3 wood · 2 metal" as icon chips. `have` (optional player resources) marks unaffordable costs.
export function CostChips({ cost, have, size = 14 }) {
  const entries = ["wood", "metal", "energy"].filter((k) => cost?.[k]);
  return (
    <span className="cost-chips">
      {entries.map((k) => {
        const lacking = have && have[k] < cost[k];
        return (
          <span key={k} className={`cost-chip ${lacking ? "cost-chip-lacking" : ""}`} title={`${cost[k]} ${RESOURCE_META[k].label}${lacking ? ` (you have ${have[k]})` : ""}`}>
            <Icon name={RESOURCE_META[k].icon} size={size} color={RESOURCE_META[k].color} />
            <span className="mono">{cost[k]}</span>
          </span>
        );
      })}
    </span>
  );
}

// Resource readout that flashes green/red with the change amount when the value moves.
export function ResourceChip({ kind, value }) {
  const meta = RESOURCE_META[kind];
  const prev = useRef(value);
  const [delta, setDelta] = useState(null);
  useEffect(() => {
    if (prev.current !== value) {
      setDelta({ amount: value - prev.current, id: Date.now() });
      prev.current = value;
      const t = setTimeout(() => setDelta(null), 1400);
      return () => clearTimeout(t);
    }
  }, [value]);
  return (
    <div className="res-chip" title={meta.label}>
      <Icon name={meta.icon} size={20} color={meta.color} />
      <span className="res-chip-value mono">{value}</span>
      {delta && (
        <span key={delta.id} className={`res-chip-delta mono ${delta.amount > 0 ? "up" : "down"}`}>
          {delta.amount > 0 ? "+" : ""}
          {delta.amount}
        </span>
      )}
    </div>
  );
}

// Hexagonal player badge in the player's color, with a crown (human) or robot (AI) glyph.
export function PlayerEmblem({ color, name = "", size = 36, ai = false, active = false }) {
  const css = PLAYER_COLOR_CSS[color] || "#999";
  const id = `emb-${color}-${size}`;
  return (
    <svg className={`player-emblem ${active ? "player-emblem-active" : ""}`} width={size} height={size} viewBox="0 0 40 40" style={{ "--c": css }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={css} stopOpacity="1" />
          <stop offset="1" stopColor={css} stopOpacity="0.45" />
        </linearGradient>
      </defs>
      <path d="M20 2.5 35.5 11v18L20 37.5 4.5 29V11z" fill={`url(#${id})`} stroke="rgba(255,255,255,0.55)" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M20 6 32.5 13v14L20 34 7.5 27V13z" fill="rgba(5,8,15,0.55)" />
      <text x="20" y="25.5" textAnchor="middle" fill="#fff" fontFamily="Cinzel, serif" fontWeight="800" fontSize={ai ? 13 : 17}>
        {ai ? "AI" : (name.trim()[0] || "?").toUpperCase()}
      </text>
    </svg>
  );
}

export const TERRAIN_INFO = {
  plains: { name: "Plains", yield: null, blurb: "Open ground. Can host a City or Factory.", color: "#9bbd6b", icon: "plains" },
  forest: { name: "Forest", yield: "wood", blurb: "Produces Wood each round.", color: "#4f9b63", icon: "wood" },
  mine: { name: "Mine", yield: "metal", blurb: "Produces Metal each round.", color: "#a9a5bd", icon: "metal" },
  energy_field: { name: "Energy Field", yield: "energy", blurb: "Produces Energy each round.", color: "#7d93ff", icon: "energy" },
  city_site: { name: "City Site", yield: null, blurb: "Worth extra Dominion to claim. Ideal for a City.", color: "#e6cf9c", icon: "city" },
};

export const BUILDING_INFO = {
  command_hub: { name: "Command Hub", icon: "hub", blurb: "Your permanent anchor. Cannot be attacked." },
  factory: { name: "Factory", icon: "factory", blurb: "Doubles production; links a Supply Chain." },
  fortress: { name: "Fortress", icon: "fortress", blurb: "+3 defense." },
  city: { name: "City", icon: "city", blurb: "+2 defense. Supply Chain endpoint." },
};
