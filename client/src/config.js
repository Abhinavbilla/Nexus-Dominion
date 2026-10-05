import rawConfig from "../../gameConfig.json";
import { validateGameConfig, resolveModeConfig } from "@hex-dominion/shared/gameConfig.js";

// Client-side copy of the same config the server validates (spec.md §2.4).
// Used only for instant UI feedback (costs, previews) — the server remains
// the sole source of truth and re-validates every action independently.
export const BASE_CONFIG = validateGameConfig(rawConfig);

export function getModeConfig(mode = "normal", playerCount = null) {
  return resolveModeConfig(BASE_CONFIG, mode, playerCount);
}
