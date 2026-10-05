import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// Fonts are bundled locally so the game looks identical offline.
import "@fontsource/cinzel/600.css";
import "@fontsource/cinzel/800.css";
import "@fontsource/barlow-condensed/500.css";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/700.css";
import "./ui/theme.css";
import "./ui/flat.css"; // design refinement layer: must load after component CSS

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
