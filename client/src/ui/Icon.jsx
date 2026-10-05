// Single source of truth for every symbol in the game. The same SVG paths render in
// React (<Icon/>) and in the Phaser board (iconDataUrl) so symbols look identical in
// the HUD and on the map. 24x24 grid, stroke-based, designed to read at 14-40px.

const P = {
  wood: '<path d="M12 2.5 6.5 10h3L5 16.5h5.2V21h3.6v-4.5H19L14.5 10h3z" fill="currentColor" fill-opacity=".9" stroke="currentColor" stroke-width="1" stroke-linejoin="round"/>',
  metal: '<path d="M12 2.5 19.5 7v10L12 21.5 4.5 17V7z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4.5 7 12 11.5 19.5 7M12 11.5v10" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M12 2.5v9L4.5 7z" fill="currentColor" fill-opacity=".55"/>',
  energy: '<path d="M13.5 2 5 13.5h6L10 22l9-12h-6.2z" fill="currentColor" fill-opacity=".92" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
  dominion: '<path d="M3 18.5 2 8l5 4 5-8 5 8 5-4-1 10.5z" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M4 21.5h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  ap: '<path d="m6 6 6 6-6 6M13 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>',
  claim: '<path d="M6 21V3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M6.5 4h12l-3.2 4.2 3.2 4.2h-12z" fill="currentColor" fill-opacity=".85" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>',
  build: '<path d="m13.5 4.5 6 6-2.6 2.6-1.6-1.6L8 18.7a1.9 1.9 0 0 1-2.7-2.7l7.2-7.3-1.6-1.6z" fill="currentColor" fill-opacity=".85" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/>',
  attack: '<path d="m4 4 7 7M20 4l-7 7M10.5 12.5 6 17M13.5 12.5 18 17" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M4.5 18.5 7 16m11 2.5L15.5 16M3 20l2.5-2.5M21 20l-2.5-2.5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>',
  fortify: '<path d="M12 2.5 19.5 5.5v6c0 5-3.2 8.6-7.5 10-4.3-1.4-7.5-5-7.5-10v-6z" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 7v9M8.5 11.5h7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  endturn: '<path d="M5 4.5 15 12 5 19.5z" fill="currentColor" fill-opacity=".85" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M18 4.5v15" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  timer: '<circle cx="12" cy="13.5" r="7.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 9.5v4.5l3 1.8M9.5 3h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".85" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  mute: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" fill-opacity=".5" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/><path d="m16 9.5 5 5m0-5-5 5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
  bot: '<rect x="4.5" y="8" width="15" height="11" rx="3" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.6"/><path d="M12 8V4.5M10 3.5h4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="9" cy="13" r="1.6" fill="currentColor"/><circle cx="15" cy="13" r="1.6" fill="currentColor"/><path d="M9 16.5h6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
  chain: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  factory: '<path d="M3 21V11l6 4V11l6 4V6h4l2 15z" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M7 18h2m3 0h2m3 0h1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
  city: '<path d="M3 21V11h5v10M8 21V4h6.5v17M14.5 21v-8H21v8M3 21h18" fill="currentColor" fill-opacity=".22" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.5 8h2M10.5 12h2M10.5 16h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
  fortress: '<path d="M4 21V9h3V6h2v3h2V6h2v3h2V6h2v3h3v12z" fill="currentColor" fill-opacity=".25" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 21v-5a2 2 0 0 1 4 0v5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
  hub: '<path d="M12 2.5 20 7v10l-8 4.5L4 17V7z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><circle cx="12" cy="12" r="3" fill="currentColor"/>',
  plains: '<path d="M3 17c3-2 5 0 9-1.5S18 14 21 16M3 12c3-2 5 0 9-1.5S18 9 21 11M3 7c3-2 5 0 9-1.5S18 4 21 6" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>',
  close: '<path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" fill="none"/>',
  plus: '<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>',
  crown: '<path d="M3 18.5 2 8l5 4 5-8 5 8 5-4-1 10.5z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>',
  skull: '<path d="M12 3a8 8 0 0 0-5 14.2V20h10v-2.8A8 8 0 0 0 12 3z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><circle cx="9" cy="12" r="1.7" fill="currentColor"/><circle cx="15" cy="12" r="1.7" fill="currentColor"/><path d="M10.5 20v-2.5M13.5 20v-2.5" stroke="currentColor" stroke-width="1.5"/>',
  chat: '<path d="M4 5h16v11H11l-4.5 4v-4H4z" fill="currentColor" fill-opacity=".2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
  info: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M12 11v6M12 7.5v.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  swap: '<path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
};

export function iconSvgString(name, color = "currentColor", size = 24) {
  const body = P[name] || P.info;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" style="color:${color}" color="${color}">${body}</svg>`;
}

export function iconDataUrl(name, color = "#ffffff", size = 96) {
  const svg = iconSvgString(name, color, size).replace(/currentColor/g, color);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export const ICON_NAMES = Object.keys(P);

export default function Icon({ name, size = 18, color, className = "", title }) {
  const body = P[name] || P.info;
  return (
    <svg
      className={`icon ${className}`}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      style={{ color, flexShrink: 0 }}
      role={title ? "img" : "presentation"}
      aria-label={title}
      dangerouslySetInnerHTML={{ __html: body }}
    />
  );
}
