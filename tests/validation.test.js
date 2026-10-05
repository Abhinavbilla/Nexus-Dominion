import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateGameConfig } from "../shared/gameConfig.js";
import { validateClaim, validateBuild, validateAttack, validateFortify } from "../shared/validation.js";
import { BUILDING, TERRAIN } from "../shared/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawConfig = JSON.parse(readFileSync(resolve(__dirname, "../gameConfig.json"), "utf-8"));
const config = validateGameConfig(rawConfig);

function makeBoard(cells) {
  const board = new Map();
  for (const cell of cells) {
    board.set(`${cell.q},${cell.r}`, {
      terrain: TERRAIN.PLAINS,
      ownerId: null,
      building: null,
      fortificationLevel: 0,
      ...cell,
    });
  }
  return board;
}

function makePlayer(overrides = {}) {
  return {
    id: "p1",
    actionPoints: 2,
    resources: { wood: 10, metal: 10, energy: 10 },
    ...overrides,
  };
}

describe("validateClaim", () => {
  it("rejects a non-neutral target", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 1, r: 0, ownerId: "p2" }]);
    const result = validateClaim({ board, player: makePlayer(), target: board.get("1,0") });
    expect(result.valid).toBe(false);
  });

  it("rejects a target not adjacent to owned territory", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 3, r: 0, ownerId: null }]);
    const result = validateClaim({ board, player: makePlayer(), target: board.get("3,0") });
    expect(result.valid).toBe(false);
  });

  it("accepts an adjacent neutral target with AP available", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 1, r: 0, ownerId: null }]);
    const result = validateClaim({ board, player: makePlayer(), target: board.get("1,0") });
    expect(result.valid).toBe(true);
  });

  it("rejects when no Action Points remain", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 1, r: 0, ownerId: null }]);
    const result = validateClaim({ board, player: makePlayer({ actionPoints: 0 }), target: board.get("1,0") });
    expect(result.valid).toBe(false);
  });
});

describe("validateBuild", () => {
  it("rejects building on an unowned hex", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p2" }]);
    const result = validateBuild({
      board,
      player: makePlayer(),
      target: board.get("0,0"),
      buildingType: BUILDING.FACTORY,
      config,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a Factory on an occupied building slot", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", building: BUILDING.COMMAND_HUB }]);
    const result = validateBuild({
      board,
      player: makePlayer(),
      target: board.get("0,0"),
      buildingType: BUILDING.FACTORY,
      config,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects a City on Forest terrain", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", terrain: TERRAIN.FOREST }]);
    const result = validateBuild({
      board,
      player: makePlayer(),
      target: board.get("0,0"),
      buildingType: BUILDING.CITY,
      config,
    });
    expect(result.valid).toBe(false);
  });

  it("rejects insufficient resources", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", terrain: TERRAIN.PLAINS }]);
    const result = validateBuild({
      board,
      player: makePlayer({ resources: { wood: 0, metal: 0, energy: 0 } }),
      target: board.get("0,0"),
      buildingType: BUILDING.FACTORY,
      config,
    });
    expect(result.valid).toBe(false);
  });

  it("accepts a valid Factory build on owned Mine", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", terrain: TERRAIN.MINE }]);
    const result = validateBuild({
      board,
      player: makePlayer(),
      target: board.get("0,0"),
      buildingType: BUILDING.FACTORY,
      config,
    });
    expect(result.valid).toBe(true);
  });

  it("enforces the 2-City-per-player limit", () => {
    const board = makeBoard([
      { q: 0, r: 0, ownerId: "p1", terrain: TERRAIN.PLAINS, building: BUILDING.CITY },
      { q: 1, r: 0, ownerId: "p1", terrain: TERRAIN.PLAINS, building: BUILDING.CITY },
      { q: 2, r: 0, ownerId: "p1", terrain: TERRAIN.CITY_SITE },
    ]);
    const result = validateBuild({
      board,
      player: makePlayer(),
      target: board.get("2,0"),
      buildingType: BUILDING.CITY,
      config,
    });
    expect(result.valid).toBe(false);
  });
});

describe("validateAttack", () => {
  it("rejects attacking your own hex", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 1, r: 0, ownerId: "p1" }]);
    const result = validateAttack({ board, attacker: makePlayer(), target: board.get("1,0"), config });
    expect(result.valid).toBe(false);
  });

  it("rejects attacking a Command Hub", () => {
    const board = makeBoard([
      { q: 0, r: 0, ownerId: "p1" },
      { q: 1, r: 0, ownerId: "p2", building: BUILDING.COMMAND_HUB },
    ]);
    const result = validateAttack({ board, attacker: makePlayer(), target: board.get("1,0"), config });
    expect(result.valid).toBe(false);
  });

  it("rejects a non-adjacent target", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 3, r: 0, ownerId: "p2" }]);
    const result = validateAttack({ board, attacker: makePlayer(), target: board.get("3,0"), config });
    expect(result.valid).toBe(false);
  });

  it("accepts a valid adjacent enemy target", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }, { q: 1, r: 0, ownerId: "p2" }]);
    const result = validateAttack({ board, attacker: makePlayer(), target: board.get("1,0"), config });
    expect(result.valid).toBe(true);
  });
});

describe("validateFortify", () => {
  it("rejects fortifying a Command Hub", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", building: BUILDING.COMMAND_HUB }]);
    const result = validateFortify({ player: makePlayer(), target: board.get("0,0"), config });
    expect(result.valid).toBe(false);
  });

  it("rejects exceeding max fortification level", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", fortificationLevel: 3 }]);
    const result = validateFortify({ player: makePlayer(), target: board.get("0,0"), config });
    expect(result.valid).toBe(false);
  });

  it("accepts a valid fortify on owned non-hub hex", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1", fortificationLevel: 1 }]);
    const result = validateFortify({ player: makePlayer(), target: board.get("0,0"), config });
    expect(result.valid).toBe(true);
  });
});
