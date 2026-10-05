import { useEffect } from "react";
import { useGameStore } from "./state/gameStore.js";
import { initSocketClient } from "./networking/SocketClient.js";
import MainMenu from "./ui/MainMenu.jsx";
import Lobby from "./ui/Lobby.jsx";
import GameScreen from "./ui/GameScreen.jsx";
import VictoryScreen from "./ui/VictoryScreen.jsx";

export default function App() {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    initSocketClient();
  }, []);

  switch (screen) {
    case "lobby":
      return <Lobby />;
    case "game":
      return <GameScreen />;
    case "victory":
      return <VictoryScreen />;
    default:
      return <MainMenu />;
  }
}
