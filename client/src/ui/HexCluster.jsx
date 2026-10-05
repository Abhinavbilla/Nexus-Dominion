import { useMemo } from "react";
import { tileMetrics } from "../game/art/tileArt.js";
import { buildingMetrics } from "../game/art/buildingArt.js";
import { tileUrl, buildingUrl } from "./artUrls.js";
import Icon from "./Icon.jsx";
import "./HexCluster.css";

const ART_HEX = 20;

// Renders a small group of the game's real painted tiles/buildings for illustrations.
// items: { q, r, terrain, variant?, building?, color?, glow?, badge?, label? }
// links: { from:[q,r], to:[q,r], color } animated flow lines between hex centres.
export default function HexCluster({ items, links = [], radius = 46, width = 360, height = 260, className = "" }) {
  const laid = useMemo(() => {
    const tm = tileMetrics(ART_HEX);
    const bm = buildingMetrics(ART_HEX);
    const k = radius / tm.S;
    const pos = (q, r) => ({ x: radius * Math.sqrt(3) * (q + r / 2), y: radius * 1.5 * r });
    return {
      k,
      pos,
      list: items
        .map((it, i) => {
          const { x, y } = pos(it.q, it.r);
          return {
            ...it,
            i,
            x,
            y,
            tile: tileUrl(it.terrain, it.variant ?? 0, ART_HEX),
            bld: it.building ? buildingUrl(it.building, it.color || "#4c8dff", ART_HEX) : null,
            tileStyle: { left: x - tm.cx * k, top: y - tm.cy * k, width: tm.W * k, height: tm.H * k },
            bldStyle: { left: x - bm.cx * k, top: y + radius * 0.1 - bm.groundY * k, width: bm.W * k, height: bm.H * k },
          };
        })
        .sort((a, b) => a.y - b.y || a.x - b.x),
    };
  }, [items, radius]);

  const hexPoints = (r) =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (Math.PI / 180) * (60 * i - 30);
      return `${(r * Math.cos(a)).toFixed(1)},${(r * Math.sin(a)).toFixed(1)}`;
    }).join(" ");

  return (
    <div className={`hexcluster ${className}`} style={{ width, height }}>
      <div className="hexcluster-origin">
        {laid.list.map((t) => (
          <div className="hexcluster-hex" key={t.i}>
            <img className="hexcluster-tile" src={t.tile} style={t.tileStyle} alt="" draggable="false" />
            {t.glow && (
              <svg className="hexcluster-glow" style={{ left: t.x - radius, top: t.y - radius, width: radius * 2, height: radius * 2 }} viewBox={`${-radius} ${-radius} ${radius * 2} ${radius * 2}`}>
                <polygon points={hexPoints(radius * 0.97)} fill={t.glow} fillOpacity="0.18" stroke={t.glow} strokeWidth="3" strokeLinejoin="round" />
              </svg>
            )}
            {t.bld && <img className="hexcluster-bld" src={t.bld} style={t.bldStyle} alt="" draggable="false" />}
            {t.badge && (
              <span className="hexcluster-badge" style={{ left: t.x, top: t.y - (t.bld ? radius * 0.1 : 0) }}>
                <Icon name={t.badge} size={16} color={t.glow || "#fff"} />
              </span>
            )}
            {t.label && (
              <span className="hexcluster-label" style={{ left: t.x, top: t.y + radius * 0.82 }}>
                {t.label}
              </span>
            )}
          </div>
        ))}
        {links.length > 0 && (
          <svg className="hexcluster-links" style={{ left: -width / 2, top: -height / 2, width, height }} viewBox={`${-width / 2} ${-height / 2} ${width} ${height}`}>
            {links.map((l, i) => {
              const a = laid.pos(...l.from);
              const b = laid.pos(...l.to);
              return (
                <g key={i}>
                  <line x1={a.x} y1={a.y - 4} x2={b.x} y2={b.y - 4} stroke={l.color} strokeOpacity="0.25" strokeWidth="9" strokeLinecap="round" />
                  <line className="hexcluster-flow" x1={a.x} y1={a.y - 4} x2={b.x} y2={b.y - 4} stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeDasharray="2 12" />
                </g>
              );
            })}
          </svg>
        )}
      </div>
    </div>
  );
}
