import { useEffect, useRef, useState } from "react";
import { useGameStore, isMyTurn } from "../state/gameStore.js";
import { rulesOf } from "./rules.js";
import "./TurnBanner.css";

// Cinematic "YOUR TURN" / "ROUND N" banner. Fires on turn and round changes only.
export default function TurnBanner() {
  const gameState = useGameStore((s) => s.gameState);
  const playerId = useGameStore((s) => s.playerId);
  const prev = useRef(null);
  const [banner, setBanner] = useState(null);

  const idx = gameState?.currentPlayerIndex;
  const round = gameState?.currentRound;
  const status = gameState?.status;
  const mine = isMyTurn();

  useEffect(() => {
    if (!gameState || status !== "playing") return;
    const last = prev.current;
    prev.current = { idx, round, mine };
    if (!last) return;
    const roundChanged = round !== last.round;
    const turnChanged = idx !== last.idx;
    if (!roundChanged && !turnChanged) return;

    const max = rulesOf(gameState).maxRounds;
    let next = null;
    if (mine) next = { id: Date.now(), title: "YOUR TURN", sub: roundChanged ? `Round ${round} of ${max}` : "Spend your 2 actions", kind: "mine" };
    else if (roundChanged) next = { id: Date.now(), title: `ROUND ${round}`, sub: `of ${max}`, kind: "round" };
    if (!next) return;
    setBanner(next);
    const t = setTimeout(() => setBanner(null), 1500);
    return () => clearTimeout(t);
  }, [idx, round, status, mine, playerId]);

  if (!banner) return null;
  return (
    <div className="turn-banner" key={banner.id}>
      <div className={`turn-banner-inner turn-banner-${banner.kind}`}>
        <span className="turn-banner-title font-title">{banner.title}</span>
        <span className="turn-banner-sub">{banner.sub}</span>
      </div>
    </div>
  );
}
