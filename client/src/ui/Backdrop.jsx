import { useMemo } from "react";
import { renderBackdrop } from "../game/art/backdropArt.js";
import "./Backdrop.css";

let cached = null;
function backdropUrl() {
  if (!cached) cached = renderBackdrop(1600, 1000, 7).toDataURL("image/jpeg", 0.86);
  return cached;
}

// Full-screen painted space backdrop with slow parallax drift, used behind menu screens.
export default function Backdrop({ children, className = "" }) {
  const url = useMemo(backdropUrl, []);
  return (
    <div className={`backdrop ${className}`}>
      <div className="backdrop-art" style={{ backgroundImage: `url(${url})` }} />
      <div className="backdrop-glow" />
      <div className="backdrop-content">{children}</div>
    </div>
  );
}
