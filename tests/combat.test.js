import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateGameConfig } from "../shared/gameConfig.js";
import { calculateAttackStrength, calculateDefenseStrength, resolveAttack } from "../shared/combat.js";
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

describe("calculateAttackStrength", () => {
  it("is base 4 with no support and no supply chain", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }]);
    const result = calculateAttackStrength({
      board,
      targetHex: { q: 0, r: 0 },
      attackerId: "p1",
      hasActiveSupplyChain: false,
      config,
    });
    expect(result.total).toBe(4);
    expect(result.breakdown).toEqual({ base: 4, support: 0, supplyChain: 0 });
  });

  it("adds +1 support when 2+ adjacent friendly hexes", () => {
    const board = makeBoard([
      { q: 0, r: 0, ownerId: "p1" },
      { q: 1, r: 0, ownerId: "p1" },
      { q: -1, r: 0, ownerId: "p1" },
    ]);
    const result = calculateAttackStrength({
      board,
      targetHex: { q: 0, r: 0 },
      attackerId: "p1",
      hasActiveSupplyChain: false,
      config,
    });
    expect(result.total).toBe(5);
  });

  it("adds +1 for an active supply chain", () => {
    const board = makeBoard([{ q: 0, r: 0, ownerId: "p1" }]);
    const result = calculateAttackStrength({
      board,
      targetHex: { q: 0, r: 0 },
      attackerId: "p1",
      hasActiveSupplyChain: true,
      config,
    });
    expect(result.total).toBe(5);
  });

  it("caps total attack strength at 6", () => {
    const board = makeBoard([
      { q: 0, r: 0, ownerId: "p1" },
      { q: 1, r: 0, ownerId: "p1" },
      { q: -1, r: 0, ownerId: "p1" },
    ]);
    const result = calculateAttackStrength({
      board,
      targetHex: { q: 0, r: 0 },
      attackerId: "p1",
      hasActiveSupplyChain: true,
      config,
    });
    expect(result.total).toBe(6);
  });
});

describe("calculateDefenseStrength", () => {
  it("is base 3 with no buildings or fortification", () => {
    const result = calculateDefenseStrength({ targetHex: { building: null, fortificationLevel: 0 }, config });
    expect(result.total).toBe(3);
  });

  it("adds fortress, city, and fortification bonuses", () => {
    const fortress = calculateDefenseStrength({
      targetHex: { building: BUILDING.FORTRESS, fortificationLevel: 0 },
      config,
    });
    expect(fortress.total).toBe(6);

    const city = calculateDefenseStrength({
      targetHex: { building: BUILDING.CITY, fortificationLevel: 2 },
      config,
    });
    expect(city.total).toBe(3 + 2 + 2);
  });
});

describe("resolveAttack", () => {
  it("succeeds when attack >= defense", () => {
    expect(resolveAttack(4, 3)).toBe("SUCCESS");
    expect(resolveAttack(3, 3)).toBe("SUCCESS");
  });

  it("fails when attack < defense", () => {
    expect(resolveAttack(3, 4)).toBe("FAILED");
  });
});
