import { useEffect, useRef } from "react";
import Phaser from "phaser";
import GameScene from "./GameScene.js";
import { useGameStore } from "../state/gameStore.js";
import "./PhaserGame.css";

export default function PhaserGame({ onHexClick, highlightKeys = [] }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const onHexClickRef = useRef(onHexClick);

  const gameState = useGameStore((s) => s.gameState);
  const selectedHex = useGameStore((s) => s.selectedHex);

  useEffect(() => {
    onHexClickRef.current = onHexClick;
    if (sceneRef.current) sceneRef.current.onHexClick = onHexClick;
  }, [onHexClick]);

  useEffect(() => {
    const el = containerRef.current;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: el,
      width: el.clientWidth,
      height: el.clientHeight,
      backgroundColor: "#060a14",
      scene: GameScene,
    });

    game.events.once(Phaser.Core.Events.READY, () => {
      const scene = game.scene.keys.GameScene;
      scene.onHexClick = onHexClickRef.current;
      sceneRef.current = scene;
      const current = useGameStore.getState();
      if (current.gameState) scene.updateState(current.gameState, current.selectedHex);
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      game.scale.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      game.destroy(true);
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current && gameState) {
      sceneRef.current.updateState(gameState, selectedHex, highlightKeys);
    }
  }, [gameState, selectedHex, highlightKeys]);

  return <div ref={containerRef} className="phaser-container" />;
}
