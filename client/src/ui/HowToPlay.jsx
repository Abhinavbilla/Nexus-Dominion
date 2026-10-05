import "./HowToPlay.css";

const SECTIONS = [
  {
    title: "Objective",
    body: "Expand your territory, build infrastructure, and accumulate Dominion Points. First to the victory threshold wins — or the highest score when the round limit is reached.",
  },
  {
    title: "Turns & Action Points",
    body: "Each turn you get 2 Action Points and 25 seconds. Every action — Claim, Build, Attack, Fortify — costs 1 AP. End your turn early or let the timer run out.",
  },
  {
    title: "Territory & Resources",
    body: "Claim neutral hexes adjacent to your territory. Forest, Mine, and Energy Field hexes generate Wood, Metal, and Energy each round. Build a Factory on them to double production.",
  },
  {
    title: "Supply Chains",
    body: "Connect a resource hex (with a Factory) to one of your Cities through an unbroken path of owned hexes. An active Supply Chain grants bonus resources and one-time Dominion rewards — but capturing a link in the chain breaks it instantly.",
  },
  {
    title: "Combat",
    body: "Combat is fully deterministic — no dice. Attack Strength (base 4, +1 for flanking support, +1 with an active Supply Chain) is compared against Defense Strength (base 3, +3 Fortress, +2 City, +1 per Fortification level). Strength ≥ Defense succeeds.",
  },
  {
    title: "Command Hub",
    body: "Your starting hex holds your permanent Command Hub. It can never be captured, replaced, or fortified — it's your anchor, not an economic asset.",
  },
];

export default function HowToPlay({ onBack }) {
  return (
    <div className="howto-root">
      <div className="howto-panel glass-panel fade-in-up">
        <div className="howto-header">
          <h2 className="font-display">HOW TO PLAY</h2>
          <button className="btn" onClick={onBack}>
            Back
          </button>
        </div>
        <div className="howto-sections scrollbar-thin">
          {SECTIONS.map((s) => (
            <div className="howto-section" key={s.title}>
              <h3 className="font-display">{s.title}</h3>
              <p className="text-dim">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
