// Pure validation/normalization for gameConfig.json (spec.md §2.4). This
// module performs no file I/O so it stays isomorphic: the server loads the
// JSON via fs, the client loads it via a bundled static import, tests may
// construct fixtures inline — all three call validateGameConfig(raw).

const REQUIRED_TOP_LEVEL_KEYS = [
  "modes",
  "BOARD_RADIUS",
  "TOTAL_HEXES",
  "TERRAIN_COUNTS",
  "FAIRNESS",
  "STARTING_POSITIONS",
  "PLAYER_COLORS",
  "ACTION_POINTS_PER_TURN",
  "STARTING_RESOURCES",
  "RESOURCE_GENERATION",
  "BUILD_COSTS",
  "BUILD_LIMITS",
  "ATTACK_COSTS",
  "FORTIFY_COSTS",
  "DEFENSE_VALUES",
  "ATTACK_VALUES",
  "DOMINION_REWARDS",
];

export function validateGameConfig(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("gameConfig: expected an object");
  }
  for (const key of REQUIRED_TOP_LEVEL_KEYS) {
    if (!(key in raw)) {
      throw new Error(`gameConfig: missing required key "${key}"`);
    }
  }
  const terrainTotal = Object.values(raw.TERRAIN_COUNTS).reduce((a, b) => a + b, 0);
  if (terrainTotal !== raw.TOTAL_HEXES) {
    throw new Error(
      `gameConfig: TERRAIN_COUNTS sum to ${terrainTotal}, expected TOTAL_HEXES=${raw.TOTAL_HEXES}`
    );
  }
  if (raw.STARTING_POSITIONS.length < 2 || raw.STARTING_POSITIONS.length > 4) {
    throw new Error("gameConfig: STARTING_POSITIONS must have between 2 and 4 entries");
  }
  return deepFreeze(structuredClone(raw));
}

export function resolveModeConfig(config, mode = "normal") {
  const modeConfig = config.modes[mode];
  if (!modeConfig) {
    throw new Error(`gameConfig: unknown mode "${mode}"`);
  }
  return { ...config, ...modeConfig, mode };
}

function deepFreeze(obj) {
  if (obj && typeof obj === "object" && !Object.isFrozen(obj)) {
    Object.values(obj).forEach(deepFreeze);
    Object.freeze(obj);
  }
  return obj;
}
