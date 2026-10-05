import { useMemo } from "react";
import { renderTile } from "../game/art/tileArt.js";
import Backdrop from "./Backdrop.jsx";
import Icon from "./Icon.jsx";
import { TERRAIN_INFO } from "./bits.jsx";
import "./HowToPlay.css";

const SECTIONS = [
  { icon: "crown", title: "Objective", body: "Expand your territory, build infrastructure, and earn Dominion Points. When someone reaches 40 Dominion the match enters its final round — everyone finishes the round, then the highest score wins. If nobody gets there, the best score after round 18 wins." },
  { icon: "ap", title: "Turns & Actions", body: "Each turn you get 2 actions and 25 seconds. Every action — Claim, Build, Attack, Fortify — costs 1 action. End your turn early or let the timer run out. The starting player rotates every round." },
  { icon: "claim", title: "Territory & Resources", body: "Claim neutral hexes next to your land. Forests, Mines and Energy Fields produce Wood, Metal and Energy every round. A Factory on them doubles the output." },
  { icon: "chain", title: "Supply Chains", body: "Link a Factory on a resource hex to one of your Cities through an unbroken path of your own hexes. An active chain pays bonus resources and a one-time Dominion reward (+4 for your first, +2 after) — but capturing a hex in the path breaks it." },
  { icon: "attack", title: "Combat", body: "No dice. Attack Strength (base 4, +1 flanking support, +1 with an active Supply Chain) is compared with Defense (base 3, +3 Fortress, +2 City, +1 per fortification level). Attack ≥ Defense captures the hex: +2 Dominion (+3 City Site, +4 enemy City)." },
  { icon: "hub", title: "Command Hub", body: "Your starting hex holds your permanent Command Hub. It can never be captured, replaced or fortified — it is your anchor." },
];

const KEYS = [
  ["C", "Claim"],
  ["B", "Build"],
  ["A", "Attack"],
  ["F", "Fortify"],
  ["E", "End turn"],
  ["Esc", "Cancel"],
];

export default function HowToPlay({ onBack }) {
  const tiles = useMemo(
    () => Object.fromEntries(Object.keys(TERRAIN_INFO).map((t) => [t, renderTile(t, 0, 18).canvas.toDataURL("image/png")])),
    []
  );

  return (
    <Backdrop className="howto-root">
      <div className="howto-wrap">
        <div className="howto-panel glass-panel fade-in-up">
          <div className="howto-header">
            <h2 className="font-title">HOW TO PLAY</h2>
            <button className="btn" onClick={onBack}>
              Back
            </button>
          </div>

          <div className="howto-body scrollbar-thin">
            <div className="howto-sections">
              {SECTIONS.map((s) => (
                <div className="howto-card" key={s.title}>
                  <span className="howto-card-icon">
                    <Icon name={s.icon} size={22} color="var(--gold)" />
                  </span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <h3 className="howto-sub">Terrain</h3>
            <div className="howto-terrain">
              {Object.entries(TERRAIN_INFO).map(([key, t]) => (
                <div className="howto-terrain-item" key={key}>
                  <img src={tiles[key]} alt="" draggable="false" />
                  <b>{t.name}</b>
                  <span>{t.blurb}</span>
                </div>
              ))}
            </div>

            <h3 className="howto-sub">Shortcuts</h3>
            <div className="howto-keys">
              {KEYS.map(([k, label]) => (
                <span className="howto-key" key={k}>
                  <kbd>{k}</kbd> {label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Backdrop>
  );
}
