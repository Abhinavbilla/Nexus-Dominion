import { useState } from "react";
import { useGameStore, getMyPlayer, isMyTurn } from "../state/gameStore.js";
import { rulesOf } from "./rules.js";
import Icon from "./Icon.jsx";
import "./HintBar.css";

const COACH_KEY = "hexdominion_coach";
const coachEnabled = () => {
  try {
    return localStorage.getItem(COACH_KEY) !== "off";
  } catch {
    return true;
  }
};

const RESOURCE_TERRAIN = new Set(["forest", "mine", "energy_field"]);

// The next thing a new player should try, derived purely from the board state.
function coachGoals(gameState, me) {
  const mine = gameState.board.filter((c) => c.ownerId === me.id);
  const has = (b) => mine.some((c) => c.building === b);
  const chain = gameState.activeSupplyChains.some((c) => c.playerId === me.id);
  const rules = rulesOf(gameState);
  return [
    { done: mine.length >= 4, icon: "claim", text: "Claim land: pick Claim (C), then click a glowing hex next to your territory." },
    { done: mine.some((c) => RESOURCE_TERRAIN.has(c.terrain)), icon: "forest", text: "Claim a Forest, Mine or Energy Field — they produce resources every round." },
    { done: has("factory"), icon: "factory", text: "Build a Factory (B) on a resource hex you own. It doubles that hex's output." },
    { done: has("city"), icon: "city", text: "Build a City (B) on Plains or a City Site. You need Wood, Metal and Energy for it." },
    { done: chain, icon: "chain", text: `Connect the Factory to the City with your own hexes to start a Supply Chain (+${gameState.rules?.chainPerRound ?? 1} Dominion every round).` },
    { done: me.stats.attacksLaunched > 0, icon: "attack", text: "Attack (A) an enemy hex next to your land. The preview shows the exact odds first." },
    { done: false, icon: "dominion", text: `Reach ${rules.victoryScore} Dominion. Protect your chain and cut the leader's.` },
  ];
}

export default function HintBar() {
  const gameState = useGameStore((s) => s.gameState);
  const actionMode = useGameStore((s) => s.actionMode);
  const pendingBuildType = useGameStore((s) => s.pendingBuildType);
  const setHelpOpen = useGameStore((s) => s.setHelpOpen);
  const [coach, setCoach] = useState(coachEnabled);
  const me = getMyPlayer();
  const myTurn = isMyTurn();
  if (!gameState || !me || gameState.status !== "playing") return null;

  const current = gameState.players[gameState.currentPlayerIndex];
  const ap = me.actionPoints;
  let primary;
  if (!myTurn) {
    primary = { icon: "timer", tone: "wait", title: `${current.name} is playing…`, text: "Plan your next move — hover hexes to inspect them." };
  } else if (ap === 0) {
    primary = { icon: "endturn", tone: "ready", title: "Out of actions", text: "Press End Turn (E) to pass play." };
  } else if (actionMode === "claim") {
    primary = { icon: "claim", tone: "act", title: "Claim land", text: "Click a glowing hex next to your territory. Free: +1 Dominion (+2 on a City Site)." };
  } else if (actionMode === "build") {
    primary = pendingBuildType
      ? { icon: "build", tone: "act", title: `Build a ${pendingBuildType}`, text: "Click a glowing hex you own to place it." }
      : { icon: "build", tone: "act", title: "Build", text: "Choose a structure in the panel on the left." };
  } else if (actionMode === "attack") {
    primary = { icon: "attack", tone: "danger", title: "Attack", text: "Click a glowing enemy hex touching your land, then confirm. Nothing happens until you confirm." };
  } else if (actionMode === "fortify") {
    primary = { icon: "fortify", tone: "act", title: "Fortify", text: "Click one of your hexes to give it +1 defense (max 3)." };
  } else {
    primary = { icon: "pointer", tone: "go", title: `Your turn — ${ap} action${ap === 1 ? "" : "s"} left`, text: "Choose Claim, Build, Attack or Fortify on the left." };
  }

  const goals = coach ? coachGoals(gameState, me) : null;
  const goalIndex = goals ? goals.findIndex((g) => !g.done) : -1;
  const goal = goals && goalIndex >= 0 ? goals[goalIndex] : null;

  function dismissCoach() {
    try {
      localStorage.setItem(COACH_KEY, "off");
    } catch {
      /* storage unavailable */
    }
    setCoach(false);
  }

  return (
    <div className={`hintbar hintbar-${primary.tone}`}>
      <div className="hintbar-main">
        <span className="hintbar-icon">
          <Icon name={primary.icon} size={22} />
        </span>
        <div className="hintbar-text">
          <b>{primary.title}</b>
          <span>{primary.text}</span>
        </div>
      </div>
      {goal && (
        <div className="hintbar-coach" title="Guided tips for new players">
          <span className="hintbar-coach-label">
            <Icon name="bulb" size={14} color="var(--gold-bright)" /> TIP {goalIndex + 1}/{goals.length}
          </span>
          <span className="hintbar-coach-text">{goal.text}</span>
          <button className="hintbar-x" onClick={dismissCoach} aria-label="Hide tips" title="Hide tips">
            <Icon name="close" size={13} />
          </button>
        </div>
      )}
      <button className="hintbar-help" onClick={() => setHelpOpen(true)} title="How to play (H)">
        <Icon name="help" size={18} />
        <span>Rules</span>
      </button>
    </div>
  );
}
