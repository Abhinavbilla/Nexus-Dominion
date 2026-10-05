// Enums shared by server, client, and tests. Keep these as plain string
// unions (not classes/TS enums) so they serialize untouched over Socket.IO.

export const TERRAIN = {
  PLAINS: "plains",
  FOREST: "forest",
  MINE: "mine",
  ENERGY_FIELD: "energy_field",
  CITY_SITE: "city_site",
};

export const BUILDING = {
  NONE: null,
  FACTORY: "factory",
  FORTRESS: "fortress",
  CITY: "city",
  COMMAND_HUB: "command_hub",
};

export const RESOURCE = {
  WOOD: "wood",
  METAL: "metal",
  ENERGY: "energy",
};

export const ACTION_TYPE = {
  CLAIM: "claim",
  BUILD: "build",
  ATTACK: "attack",
  FORTIFY: "fortify",
  END_TURN: "end_turn",
};

export const MATCH_STATUS = {
  LOBBY: "lobby",
  PLAYING: "playing",
  FINISHED: "finished",
};

// Canonical fixed axial-neighbor order (spec.md §5). Every BFS/traversal in
// the game must iterate neighbors in exactly this order for determinism.
export const AXIAL_DIRECTIONS = [
  { q: 1, r: 0 },
  { q: -1, r: 0 },
  { q: 0, r: 1 },
  { q: 0, r: -1 },
  { q: 1, r: -1 },
  { q: -1, r: 1 },
];

export const RESOURCE_TERRAIN = {
  [TERRAIN.FOREST]: RESOURCE.WOOD,
  [TERRAIN.MINE]: RESOURCE.METAL,
  [TERRAIN.ENERGY_FIELD]: RESOURCE.ENERGY,
};
