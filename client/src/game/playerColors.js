// Must mirror gameConfig.json PLAYER_COLORS keys (spec.md §14). The keys stay the
// server's names; the values are the game's rich palette (cobalt / ember / amethyst / verdant).
export const PLAYER_COLOR_CSS = {
  cyan: "#4c8dff",
  orange: "#ff6b3d",
  violet: "#b070ff",
  lime: "#5fd068",
};

export const PLAYER_COLOR_HEX = Object.fromEntries(
  Object.entries(PLAYER_COLOR_CSS).map(([k, v]) => [k, parseInt(v.slice(1), 16)])
);

export const PLAYER_COLOR_NAME = { cyan: "Cobalt", orange: "Ember", violet: "Amethyst", lime: "Verdant" };

export function colorForPlayer(player) {
  return PLAYER_COLOR_HEX[player?.color] ?? 0xffffff;
}
