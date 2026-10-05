// Must mirror gameConfig.json PLAYER_COLORS order (spec.md §14).
export const PLAYER_COLOR_HEX = {
  cyan: 0x4ff2ff,
  orange: 0xff9b4f,
  violet: 0xb57bff,
  lime: 0xc6ff4f,
};

export function colorForPlayer(player) {
  return PLAYER_COLOR_HEX[player?.color] ?? 0xffffff;
}
