import { useMemo } from "react";
import { useGameStore, getMyPlayer } from "../state/gameStore.js";
import { sendAction } from "../networking/SocketClient.js";
import { validateClaim, validateBuild, validateAttack, validateFortify } from "@hex-dominion/shared/validation.js";
import { boardArrayToMap } from "../boardMap.js";
import { BASE_CONFIG } from "../config.js";
import PhaserGame from "../game/PhaserGame.jsx";
import HUD from "./HUD.jsx";
import HintBar from "./HintBar.jsx";
import ActionBar from "./ActionBar.jsx";
import BuildMenu from "./BuildMenu.jsx";
import AttackPreview from "./AttackPreview.jsx";
import HexInspector from "./HexInspector.jsx";
import AIExplanation from "./AIExplanation.jsx";
import PlayerList from "./PlayerList.jsx";
import SideTabs from "./SideTabs.jsx";
import TurnBanner from "./TurnBanner.jsx";
import HelpModal from "./HelpModal.jsx";
import "./GameScreen.css";

function computeHighlightKeys(gameState, me, actionMode, pendingBuildType) {
  if (!gameState || !me || !actionMode) return [];
  const board = boardArrayToMap(gameState.board);
  const keys = [];

  for (const cell of board.values()) {
    const key = `${cell.q},${cell.r}`;
    let check;
    switch (actionMode) {
      case "claim":
        check = validateClaim({ board, player: me, target: cell, boardRadius: BASE_CONFIG.BOARD_RADIUS });
        break;
      case "fortify":
        check = validateFortify({ player: me, target: cell, config: BASE_CONFIG });
        break;
      case "build":
        if (!pendingBuildType) {
          check = cell.ownerId === me.id && !cell.building ? { valid: true } : { valid: false };
        } else {
          check = validateBuild({ board, player: me, target: cell, buildingType: pendingBuildType, config: BASE_CONFIG, boardRadius: BASE_CONFIG.BOARD_RADIUS });
        }
        break;
      case "attack":
        check = validateAttack({ board, attacker: me, target: cell, config: BASE_CONFIG, boardRadius: BASE_CONFIG.BOARD_RADIUS });
        break;
      default:
        check = { valid: false };
    }
    if (check.valid) keys.push(key);
  }
  return keys;
}

export default function GameScreen() {
  const gameState = useGameStore((s) => s.gameState);
  const actionMode = useGameStore((s) => s.actionMode);
  const pendingBuildType = useGameStore((s) => s.pendingBuildType);
  const selectedHex = useGameStore((s) => s.selectedHex);
  const setSelectedHex = useGameStore((s) => s.setSelectedHex);
  const clearSelection = useGameStore((s) => s.clearSelection);
  const me = getMyPlayer();

  const highlightKeys = useMemo(
    () => computeHighlightKeys(gameState, me, actionMode, pendingBuildType),
    [gameState, me, actionMode, pendingBuildType]
  );

  function handleHexClick(hex) {
    if (!actionMode) return;
    const key = `${hex.q},${hex.r}`;
    const isValidTarget = highlightKeys.includes(key);

    if (actionMode === "claim") {
      if (isValidTarget) sendAction("claim", hex);
      clearSelection();
    } else if (actionMode === "fortify") {
      if (isValidTarget) sendAction("fortify", hex);
      clearSelection();
    } else if (actionMode === "build") {
      if (!pendingBuildType) return;
      if (isValidTarget) sendAction("build", { ...hex, buildingType: pendingBuildType });
      clearSelection();
    } else if (actionMode === "attack") {
      if (isValidTarget) setSelectedHex(hex);
    }
  }

  // One contextual slot under the actions: the build menu, the attack preview, or the hex inspector.
  const showInspector = actionMode !== "build" && !(actionMode === "attack" && selectedHex);

  return (
    <div className="game-root">
      <HUD />

      <div className="game-middle">
        <div className="game-left">
          <ActionBar />
          <div className="game-context scrollbar-thin">
            <BuildMenu />
            <AttackPreview />
            {showInspector && <HexInspector />}
          </div>
        </div>

        <div className="game-center">
          <HintBar />
          <div className="game-board-wrap">
            <PhaserGame onHexClick={handleHexClick} highlightKeys={highlightKeys} />
            <TurnBanner />
          </div>
        </div>

        <div className="game-right">
          <PlayerList />
          <AIExplanation />
          <SideTabs />
        </div>
      </div>

      <HelpModal />
    </div>
  );
}
