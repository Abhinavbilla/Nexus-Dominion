import { useMemo } from "react";
import { renderTile, tileMetrics } from "../game/art/tileArt.js";
import { renderBuilding, buildingMetrics } from "../game/art/buildingArt.js";
import "./HeroTiles.css";

const ART_HEX = 26; // tile art is rendered at this world size, then scaled to RADIUS px
const RADIUS = 62; // on-screen hex radius in px

// Cluster of the game's own painted tiles + buildings, floating on menu screens.
const CLUSTER = [
  { q: 0, r: 0, terrain: "plains", variant: 1, building: "command_hub", color: "#4c8dff" },
  { q: 1, r: 0, terrain: "mine", variant: 0, building: "factory", color: "#4c8dff" },
  { q: -1, r: 1, terrain: "city_site", variant: 2, building: "city", color: "#4c8dff" },
  { q: 0, r: -1, terrain: "energy_field", variant: 1 },
  { q: -1, r: 0, terrain: "forest", variant: 2 },
  { q: 0, r: 1, terrain: "plains", variant: 0 },
  { q: 1, r: -1, terrain: "forest", variant: 0 },
  { q: 2, r: -1, terrain: "mine", variant: 2, building: "fortress", color: "#ff6b3d" },
  { q: 1, r: 1, terrain: "energy_field", variant: 0 },
];

export default function HeroTiles() {
  const items = useMemo(() => {
    const tm = tileMetrics(ART_HEX);
    const bm = buildingMetrics(ART_HEX);
    const k = RADIUS / tm.S;
    return CLUSTER.map((c, i) => {
      const x = RADIUS * Math.sqrt(3) * (c.q + c.r / 2);
      const y = RADIUS * 1.5 * c.r;
      const tile = renderTile(c.terrain, c.variant, ART_HEX).canvas.toDataURL("image/png");
      const bld = c.building ? renderBuilding(c.building, c.color, ART_HEX).canvas.toDataURL("image/png") : null;
      return {
        ...c,
        i,
        tile,
        bld,
        tileStyle: { left: x - tm.cx * k, top: y - tm.cy * k, width: tm.W * k, height: tm.H * k },
        bldStyle: { left: x - (bm.cx) * k, top: y + 6 - bm.groundY * k, width: bm.W * k, height: bm.H * k },
        delay: -((c.q * 1.3 + c.r * 0.7 + 3) % 5),
      };
    });
  }, []);

  return (
    <div className="hero-tiles" aria-hidden="true">
      <div className="hero-tiles-inner">
        {items
          .slice()
          .sort((a, b) => a.r - b.r || a.q - b.q)
          .map((t) => (
            <div className="hero-hex" key={t.i} style={{ animationDelay: `${t.delay}s` }}>
              <img className="hero-tile" src={t.tile} style={t.tileStyle} alt="" draggable="false" />
              {t.bld && <img className="hero-bld" src={t.bld} style={t.bldStyle} alt="" draggable="false" />}
            </div>
          ))}
      </div>
    </div>
  );
}
