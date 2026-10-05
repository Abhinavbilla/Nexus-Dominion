import { ICONS } from "./iconData.js";

// Every symbol in the game comes from professionally drawn open icon sets (game-icons.net for
// gameplay symbols, Phosphor duotone for interface chrome — see scripts/gen-icons.mjs). The same
// geometry renders in React (<Icon/>) and on the Phaser board (iconDataUrl), so a symbol looks
// identical in the HUD and on the map.

const FALLBACK = ICONS.info;

function entry(name) {
  return ICONS[name] || FALLBACK;
}

export function iconSvgString(name, color = "currentColor", size = 24) {
  const { body, w, h } = entry(name);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${w} ${h}">${body.replace(/currentColor/g, color)}</svg>`;
}

export function iconDataUrl(name, color = "#ffffff", size = 96) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSvgString(name, color, size))}`;
}

export const ICON_NAMES = Object.keys(ICONS);

export default function Icon({ name, size = 18, color, className = "", title }) {
  const { body, w, h } = entry(name);
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${w} ${h}`}
      style={{ color, flexShrink: 0 }}
      role={title ? "img" : "presentation"}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
