import { useEffect } from "react";
import { useGameStore } from "./state/gameStore.js";
import { initSocketClient } from "./networking/SocketClient.js";
import MainMenu from "./ui/MainMenu.jsx";
import Lobby from "./ui/Lobby.jsx";
import GameScreen from "./ui/GameScreen.jsx";
import VictoryScreen from "./ui/VictoryScreen.jsx";
import AudioControl from "./ui/AudioControl.jsx";

export default function App() {
  const screen = useGameStore((s) => s.screen);

  useEffect(() => {
    initSocketClient();
  }, []);

  const screens = { lobby: <Lobby />, game: <GameScreen />, victory: <VictoryScreen /> };
  const view = screens[screen] || <MainMenu />;

  // the game screen has the control in its top bar; every other screen gets a floating one
  return (
    <>
      {view}
      {screen !== "game" && <AudioControl floating />}
    </>
  );
}
