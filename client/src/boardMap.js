// The server's wire format serializes the board as an array (spec.md §76.1).
// Shared rule functions (validation, combat, supplyChain) expect a
// Map<"q,r", HexCell> — this converts the mirror back for client-side use
// (attack previews, build-menu affordability, action-mode highlighting).
export function boardArrayToMap(board) {
  return new Map(board.map((cell) => [`${cell.q},${cell.r}`, cell]));
}
