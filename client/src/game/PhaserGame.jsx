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
  const actionMode = useGameStore((s) => s.actionMode);
  const setHoveredHex = useGameStore((s) => s.setHoveredHex);

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
      backgroundColor: "#07090f",
      audio: { noAudio: true }, // sound effects use Web Audio directly (audio/AudioManager.js)
      scene: GameScene,
    });

    let disposed = false;
    game.events.once(Phaser.Core.Events.READY, () => {
      if (disposed) return;
      const scene = game.scene.keys.GameScene;
      scene.onHexClick = onHexClickRef.current;
      scene.onHoverHex = (hex) => useGameStore.getState().setHoveredHex(hex);
      sceneRef.current = scene;
      const current = useGameStore.getState();
      if (current.gameState) scene.updateState(current.gameState, current.selectedHex, [], current.actionMode);
    });

    const handleResize = () => {
      if (!containerRef.current) return;
      if (containerRef.current.clientWidth < 2 || containerRef.current.clientHeight < 2) return;
      game.scale.resize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      disposed = true;
      // React StrictMode mounts/unmounts immediately; destroying a game that has not finished
      // booting throws inside Phaser, so wait for READY first.
      if (game.isBooted) game.destroy(true);
      else game.events.once(Phaser.Core.Events.READY, () => game.destroy(true));
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneRef.current && gameState) {
      sceneRef.current.updateState(gameState, selectedHex, highlightKeys, actionMode);
    }
  }, [gameState, selectedHex, highlightKeys, actionMode]);

  return <div ref={containerRef} className="phaser-container" />;
}
