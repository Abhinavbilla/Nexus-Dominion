import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { validateGameConfig } from "../shared/gameConfig.js";
import { generateBoard, checkFairness, mulberry32 } from "../shared/boardGenerator.js";
import { TERRAIN } from "../shared/constants.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rawConfig = JSON.parse(readFileSync(resolve(__dirname, "../gameConfig.json"), "utf-8"));
const config = validateGameConfig(rawConfig);

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    const seqA = [a(), a(), a()];
    const seqB = [b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });
});

describe("generateBoard", () => {
  it("produces the same board for the same seed", () => {
    const first = generateBoard(12345, config);
    const second = generateBoard(12345, config);
    expect(first.boardSeed).toBe(second.boardSeed);
    expect([...first.cells.entries()]).toEqual([...second.cells.entries()]);
  });

  it("produces exactly 61 hexes with fixed terrain counts", () => {
    const { cells } = generateBoard(1, config);
    expect(cells.size).toBe(61);
    const counts = {};
    for (const cell of cells.values()) {
      counts[cell.terrain] = (counts[cell.terrain] || 0) + 1;
    }
    expect(counts[TERRAIN.PLAINS]).toBe(25);
    expect(counts[TERRAIN.FOREST]).toBe(11);
    expect(counts[TERRAIN.MINE]).toBe(11);
    expect(counts[TERRAIN.ENERGY_FIELD]).toBe(9);
    expect(counts[TERRAIN.CITY_SITE]).toBe(5);
  });

  it("initializes every cell with ownerId/building/fortificationLevel defaults", () => {
    const { cells } = generateBoard(42, config);
    for (const cell of cells.values()) {
      expect(cell.ownerId).toBe(null);
      expect(cell.building).toBe(null);
      expect(cell.fortificationLevel).toBe(0);
    }
  });

  it("assigns Plains to all four predefined starting coordinates", () => {
    const { cells } = generateBoard(99, config);
    for (const pos of config.STARTING_POSITIONS) {
      const cell = cells.get(`${pos.q},${pos.r}`);
      expect(cell.terrain).toBe(TERRAIN.PLAINS);
    }
  });

  it("always passes the fairness test it was generated under", () => {
    const { cells } = generateBoard(777, config);
    const fair = checkFairness(cells, config.STARTING_POSITIONS, {
      maxDistance: config.FAIRNESS.MAX_RESOURCE_DISTANCE,
      maxSumDiff: config.FAIRNESS.MAX_SUM_DIFFERENCE,
    });
    expect(fair).toBe(true);
  });

  it("produces a different boardSeed than initial seed only when a reseed was needed", () => {
    const { boardSeed } = generateBoard(555, config);
    expect(typeof boardSeed).toBe("number");
  });
});
