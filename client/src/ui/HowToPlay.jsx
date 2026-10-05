import { useState } from "react";
import Backdrop from "./Backdrop.jsx";
import Icon from "./Icon.jsx";
import HexCluster from "./HexCluster.jsx";
import { CostChips } from "./bits.jsx";
import { BASE_CONFIG } from "../config.js";
import "./HowToPlay.css";

const BLUE = "#4c8dff";
const EMBER = "#ff6b3d";
const GOLD = "#ffd47a";
const dom = BASE_CONFIG.DOMINION_REWARDS;
const BY = BASE_CONFIG.modes.normal.BY_PLAYER_COUNT;

// ------------------------------------------------------------------ illustrations
function GoalArt() {
  const ways = [
    ["claim", "Claim land", `+${dom.CLAIM_NORMAL}`],
    ["attack", "Capture land", `+${dom.CAPTURE_NORMAL}`],
    ["city", "Build a City", `+${dom.BUILD_CITY}`],
    ["chain", "Supply Chain", `+${dom.SUPPLY_CHAIN_FIRST}`],
  ];
  return (
    <div className="art-goal">
      <div className="art-medal">
        <Icon name="dominion" size={64} color="#2b1c05" />
      </div>
      <div className="art-meter">
        <div className="art-meter-fill" />
        <span className="mono">0</span>
        <span className="mono art-meter-end">
          <Icon name="crown" size={14} color="var(--gold-bright)" /> {BY[2].VICTORY_SCORE}
        </span>
      </div>
      <div className="art-ways">
        {ways.map(([icon, label, pts]) => (
          <div className="art-way" key={label}>
            <Icon name={icon} size={26} color="var(--gold)" />
            <span>{label}</span>
            <b className="mono">{pts}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function TurnArt() {
  const rows = [
    ["claim", "Claim", null, "#ffd47a"],
    ["build", "Build", null, "#4cc9b0"],
    ["attack", "Attack", BASE_CONFIG.ATTACK_COSTS, "#ff6a6a"],
    ["fortify", "Fortify", BASE_CONFIG.FORTIFY_COSTS, "#5aa9ff"],
  ];
  return (
    <div className="art-turn">
      <div className="art-turn-top">
        <div className="art-ring">
          <svg viewBox="0 0 44 44" width="64" height="64">
            <circle cx="22" cy="22" r="17" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="3.5" />
            <circle cx="22" cy="22" r="17" fill="none" stroke="var(--gold)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="106.8" strokeDashoffset="30" transform="rotate(-90 22 22)" />
          </svg>
          <b className="mono">{BASE_CONFIG.modes.normal.TURN_DURATION_SECONDS}</b>
        </div>
        <div className="art-pips">
          <span className="art-pips-label">2 ACTIONS</span>
          <div>
            <i />
            <i />
          </div>
        </div>
      </div>
      <div className="art-actions">
        {rows.map(([icon, label, cost, color]) => (
          <div className="art-action" key={label}>
            <span className="art-action-icon">
              <Icon name={icon} size={24} color={color} />
            </span>
            <b>{label}</b>
            <span className="art-action-cost">{cost ? <CostChips cost={cost} size={13} /> : <span className="text-faint">{label === "Claim" ? "free" : "varies"}</span>}</span>
          </div>
        ))}
        <div className="art-action art-action-end">
          <span className="art-action-icon">
            <Icon name="endturn" size={22} color="var(--text-dim)" />
          </span>
          <b>End turn</b>
        </div>
      </div>
    </div>
  );
}

function LandArt() {
  const items = [
    { q: 0, r: 0, terrain: "plains", variant: 1, building: "command_hub", color: BLUE, label: "Your Hub" },
    { q: 1, r: 0, terrain: "forest", variant: 0, glow: GOLD, badge: "claim" },
    { q: 0, r: 1, terrain: "mine", variant: 1, glow: GOLD, badge: "claim" },
    { q: -1, r: 1, terrain: "energy_field", variant: 0, glow: GOLD, badge: "claim" },
    { q: -1, r: 0, terrain: "plains", variant: 2, glow: GOLD, badge: "claim" },
    { q: 0, r: -1, terrain: "city_site", variant: 0, glow: GOLD, badge: "claim" },
    { q: 1, r: -1, terrain: "plains", variant: 0 },
  ];
  return (
    <div className="art-land">
      <HexCluster items={items} radius={50} width={380} height={300} />
      <div className="art-yields">
        {[["forest", "wood", "Forest"], ["mine", "metal", "Mine"], ["energy_field", "energy", "Energy Field"]].map(([t, r, label]) => (
          <span className="art-yield" key={t}>
            <Icon name={t} size={16} color="var(--text-dim)" /> {label} <Icon name="arrow" size={13} /> <Icon name={r} size={16} color={`var(--res-${r})`} /> <b className="mono">+1</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function ChainArt() {
  const items = [
    { q: -2, r: 1, terrain: "mine", variant: 0, building: "factory", color: BLUE, label: "Factory" },
    { q: -1, r: 0.5, terrain: "plains", variant: 1, glow: BLUE },
    { q: 0, r: 0, terrain: "plains", variant: 2, glow: BLUE },
    { q: 1, r: -0.5, terrain: "city_site", variant: 1, building: "city", color: BLUE, label: "City" },
    { q: 0, r: -1.5, terrain: "forest", variant: 0, building: "fortress", color: EMBER, label: "Enemy" },
  ].map((t) => t);
  return (
    <div className="art-chain">
      <HexCluster items={items} links={[{ from: [-2, 1], to: [-1, 0.5], color: GOLD }, { from: [-1, 0.5], to: [0, 0], color: GOLD }, { from: [0, 0], to: [1, -0.5], color: GOLD }]} radius={44} width={400} height={300} />
      <div className="art-chain-rewards">
        <span>
          <b className="mono">+{dom.SUPPLY_CHAIN_FIRST}</b> Dominion
        </span>
        <span>
          <b className="mono">+2</b> resources / round
        </span>
        <span>
          <b className="mono">+{dom.SUPPLY_CHAIN_PER_ROUND}</b> Dominion / round
        </span>
      </div>
    </div>
  );
}

function CombatArt() {
  const A = BASE_CONFIG.ATTACK_VALUES;
  const D = BASE_CONFIG.DEFENSE_VALUES;
  return (
    <div className="art-combat">
      <div className="art-duel">
        <div className="art-side art-side-you">
          <HexCluster items={[{ q: 0, r: 0, terrain: "plains", variant: 2, building: "command_hub", color: BLUE, glow: BLUE }]} radius={42} width={130} height={120} />
          <span className="art-big mono">{A.BASE_ATTACK}</span>
          <span className="art-small">ATTACK</span>
          <div className="art-mods">
            <em>+{A.SUPPORT_BONUS} flank</em>
            <em>+{A.SUPPLY_CHAIN_BONUS} chain</em>
          </div>
        </div>
        <Icon name="attack" size={44} color="var(--text-faint)" />
        <div className="art-side art-side-them">
          <HexCluster items={[{ q: 0, r: 0, terrain: "mine", variant: 2, building: "fortress", color: EMBER, glow: EMBER }]} radius={42} width={130} height={120} />
          <span className="art-big mono">{D.BASE_DEFENSE}</span>
          <span className="art-small">DEFENSE</span>
          <div className="art-mods">
            <em>+{D.FORTRESS_BONUS} fortress</em>
            <em>+{D.CITY_BONUS} city</em>
            <em>+{D.FORTIFICATION_PER_LEVEL} / fortify</em>
          </div>
        </div>
      </div>
      <div className="art-verdict">
        <Icon name="check" size={18} color="var(--success)" /> Attack ≥ Defense captures the hex
      </div>
    </div>
  );
}

function WinArt() {
  const rows = [
    ["Commander A", 96, "var(--player-cyan)"],
    ["Commander B", 71, "var(--player-orange)"],
    ["Commander C", 44, "var(--player-violet)"],
  ];
  return (
    <div className="art-win">
      <div className="art-final">
        <Icon name="crown" size={16} color="var(--gold-bright)" /> FINAL ROUND
      </div>
      {rows.map(([n, v, c]) => (
        <div className="art-score" key={n}>
          <span style={{ color: c }}>{n}</span>
          <div className="art-score-bar">
            <div style={{ width: `${v}%`, background: c }} />
          </div>
          <b className="mono">{v}</b>
        </div>
      ))}
      <div className="art-trophy">
        <Icon name="trophy" size={46} color="var(--gold)" />
      </div>
    </div>
  );
}

function TipsArt() {
  const tips = [
    ["forest", "Expand toward resources early — everything costs Wood, Metal or Energy."],
    ["factory", "Factory first, City second. Together they make a Supply Chain."],
    ["chain", "Protect the link: one captured hex breaks the whole chain."],
    ["fortify", "Fortify the border hexes your enemies are touching."],
    ["dominion", "Watch the leader's bar. Cut their chain before the final round."],
    ["keyboard", "C B A F pick actions, E ends the turn, Esc cancels."],
  ];
  return (
    <div className="art-tips">
      {tips.map(([, text], i) => (
        <div className="art-tip" key={text}>
          <span className="font-title">{String(i + 1).padStart(2, "0")}</span>
          <p>{text}</p>
        </div>
      ))}
    </div>
  );
}

// ------------------------------------------------------------------ pages
const PAGES = [
  {
    id: "goal",
    icon: "trophy",
    title: "The Goal",
    lead: "Be the first commander to reach the Dominion target. Dominion points are your score.",
    art: <GoalArt />,
    points: [
      ["claim", `Claim a neutral hex: +${dom.CLAIM_NORMAL} (City Sites +${dom.CLAIM_CITY_SITE})`],
      ["attack", `Capture an enemy hex: +${dom.CAPTURE_NORMAL} (City Site +${dom.CAPTURE_CITY_SITE}, enemy City +${dom.CAPTURE_ENEMY_CITY})`],
      ["city", `Build a City: +${dom.BUILD_CITY}`],
      ["chain", `Complete a Supply Chain: +${dom.SUPPLY_CHAIN_FIRST} first, +${dom.SUPPLY_CHAIN_SUBSEQUENT} after — then +${dom.SUPPLY_CHAIN_PER_ROUND} every round it stays connected`],
    ],
    tip: `Target: ${BY[2].VICTORY_SCORE} Dominion with 2 players, ${BY[3].VICTORY_SCORE} with 3, ${BY[4].VICTORY_SCORE} with 4. Matches usually last 30–40 minutes.`,
  },
  {
    id: "turn",
    icon: "ap",
    title: "Your Turn",
    lead: `Each turn you get ${BASE_CONFIG.ACTION_POINTS_PER_TURN} actions and ${BASE_CONFIG.modes.normal.TURN_DURATION_SECONDS} seconds. One round = every player takes one turn, then the next round begins and resources are produced.`,
    art: <TurnArt />,
    points: [
      ["claim", "Claim — take a free neutral hex that touches your land"],
      ["build", "Build — place a Factory, Fortress or City on a hex you own"],
      ["attack", "Attack — capture an adjacent enemy hex (costs metal + energy)"],
      ["fortify", "Fortify — add +1 defense to one of your hexes (max 3)"],
    ],
    tip: "Click an action (or press C, B, A, F), then click a glowing hex. Press E to end your turn early. The starting player rotates every round.",
  },
  {
    id: "land",
    icon: "forest",
    title: "Land & Resources",
    lead: "You start with a Command Hub. Grow outward one hex at a time.",
    art: <LandArt />,
    points: [
      ["hub", "You can only claim hexes that touch your territory. Your Hub can never be attacked."],
      ["forest", "Forests, Mines and Energy Fields give +1 Wood, Metal or Energy every round."],
      ["factory", "A Factory on a resource hex doubles its output (+2). A Factory on Plains gives +1 Energy."],
      ["city_site", "City Sites are worth double Dominion to claim and are great places for a City."],
    ],
    tip: "Early game: spread toward resource hexes. Wood, Metal and Energy pay for every building and attack.",
  },
  {
    id: "chain",
    icon: "chain",
    title: "Supply Chains",
    lead: "The engine of the game. Connect production to a City and it keeps paying you.",
    art: <ChainArt />,
    points: [
      ["factory", "Build a Factory on a Forest, Mine or Energy Field."],
      ["city", "Build a City on Plains or a City Site (up to 2 Cities)."],
      ["hub", "Own an unbroken path of your hexes between them."],
      ["dominion", `Reward: +${dom.SUPPLY_CHAIN_FIRST} Dominion once, then +2 resources and +${dom.SUPPLY_CHAIN_PER_ROUND} Dominion every round.`],
    ],
    tip: "If an enemy captures any hex on the path, the chain breaks instantly. Fortify the links — and cut theirs.",
  },
  {
    id: "combat",
    icon: "attack",
    title: "Combat",
    lead: "No dice, no luck. Compare two numbers — the attacker wins ties.",
    art: <CombatArt />,
    points: [
      ["attack", `Attack: base ${BASE_CONFIG.ATTACK_VALUES.BASE_ATTACK}, +${BASE_CONFIG.ATTACK_VALUES.SUPPORT_BONUS} if you own 2+ hexes next to the target, +${BASE_CONFIG.ATTACK_VALUES.SUPPLY_CHAIN_BONUS} with an active Supply Chain.`],
      ["fortify", `Defense: base ${BASE_CONFIG.DEFENSE_VALUES.BASE_DEFENSE}, +${BASE_CONFIG.DEFENSE_VALUES.FORTRESS_BONUS} Fortress, +${BASE_CONFIG.DEFENSE_VALUES.CITY_BONUS} City, +1 per Fortify level.`],
      ["claim", "Win: you take the hex, its building is destroyed, and you score Dominion."],
      ["warning", "Lose: you only spend the cost. Nothing else changes."],
    ],
    tip: "The Attack Preview shows the exact numbers before you commit — so you never attack blind.",
  },
  {
    id: "win",
    icon: "crown",
    title: "Winning",
    lead: "Reach the target and the match goes into its final round.",
    art: <WinArt />,
    points: [
      ["timer", "Everyone finishes the round, so every player gets the same number of turns."],
      ["trophy", "Highest Dominion wins. Ties: most hexes, then most Cities, then most resources."],
      ["ap", "There is no round limit. The match runs until someone reaches the target."],
      ["eye", "Your Dominion bar and everyone else's are always visible."],
    ],
    tip: "Out in front? Fortify and protect your chain. Behind? Attack the leader's links.",
  },
  {
    id: "tips",
    icon: "bulb",
    title: "Quick Tips",
    lead: "Six habits that win games.",
    art: <TipsArt />,
    points: [],
    tip: "",
    wide: true,
  },
];

// ------------------------------------------------------------------ content
export function GuideContent({ onClose, compact = false }) {
  const [index, setIndex] = useState(0);
  const page = PAGES[index];
  const last = index === PAGES.length - 1;

  return (
    <div className={`guide ${compact ? "guide-compact" : ""}`}>
      <nav className="guide-nav" aria-label="Guide sections">
        {PAGES.map((p, i) => (
          <button key={p.id} className={`guide-tab ${i === index ? "guide-tab-active" : ""} ${i < index ? "guide-tab-done" : ""}`} onClick={() => setIndex(i)}>
            <span className="guide-tab-label">{p.title}</span>
          </button>
        ))}
      </nav>

      <section className={`guide-page ${page.wide ? "guide-page-wide" : ""}`} key={page.id}>
        <div className="guide-art">{page.art}</div>
        <div className="guide-text">
          <h3 className="guide-title font-title">{page.title}</h3>
          <p className="guide-lead">{page.lead}</p>
          {page.points.length > 0 && (
            <ul className="guide-points">
              {page.points.map(([, text]) => (
                <li key={text}>
                  <span className="guide-point-dot" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          )}
          {page.tip && (
            <div className="guide-tip">
              <b>TIP</b>
              <p>{page.tip}</p>
            </div>
          )}
        </div>
      </section>

      <footer className="guide-foot">
        <button className="btn btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>
          Back
        </button>
        <div className="guide-dots">
          {PAGES.map((p, i) => (
            <i key={p.id} className={i === index ? "on" : ""} />
          ))}
        </div>
        {last ? (
          <button className="btn btn-primary" onClick={onClose}>
            {compact ? "Got it" : "Start playing"}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => setIndex(index + 1)}>
            Next
          </button>
        )}
      </footer>
      <p className="guide-credits">Icons: game-icons.net (CC BY 3.0 — Lorc, Delapouite &amp; contributors) · Phosphor Icons (MIT)</p>
    </div>
  );
}

// Full-page version for the main menu.
export default function HowToPlay({ onBack }) {
  return (
    <Backdrop className="howto-root">
      <div className="howto-wrap">
        <div className="howto-panel glass-panel fade-in-up">
          <div className="howto-header">
            <h2 className="font-title">HOW TO PLAY</h2>
            <button className="btn" onClick={onBack}>
              Close
            </button>
          </div>
          <GuideContent onClose={onBack} />
        </div>
      </div>
    </Backdrop>
  );
}
