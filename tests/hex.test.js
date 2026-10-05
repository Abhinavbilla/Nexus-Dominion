import { describe, it, expect } from "vitest";
import {
  getNeighbors,
  isValidHex,
  distanceBetweenHexes,
  enumerateBoardHexes,
  hexKey,
  isAdjacent,
  axialToPixel,
  pixelToAxial,
} from "../shared/hexMath.js";

describe("hexMath", () => {
  it("produces exactly 61 valid hexes for radius 4", () => {
    expect(enumerateBoardHexes(4)).toHaveLength(61);
  });

  it("enumerates hexes in canonical lexicographic (q, r) order", () => {
    const hexes = enumerateBoardHexes(4);
    for (let i = 1; i < hexes.length; i++) {
      const prev = hexes[i - 1];
      const cur = hexes[i];
      expect(cur.q > prev.q || (cur.q === prev.q && cur.r > prev.r)).toBe(true);
    }
  });

  it("returns the 6 neighbors in the canonical fixed order", () => {
    const neighbors = getNeighbors(0, 0);
    expect(neighbors).toEqual([
      { q: 1, r: 0 },
      { q: -1, r: 0 },
      { q: 0, r: 1 },
      { q: 0, r: -1 },
      { q: 1, r: -1 },
      { q: -1, r: 1 },
    ]);
  });

  it("validates hexes using max(|q|,|r|,|q+r|) <= radius", () => {
    expect(isValidHex(4, 0)).toBe(true);
    expect(isValidHex(4, 1)).toBe(false);
    expect(isValidHex(-4, 4)).toBe(true);
    expect(isValidHex(0, 0)).toBe(true);
  });

  it("computes correct axial distance", () => {
    expect(distanceBetweenHexes({ q: 0, r: 0 }, { q: 0, r: 0 })).toBe(0);
    expect(distanceBetweenHexes({ q: -4, r: 0 }, { q: 4, r: 0 })).toBe(8);
    expect(distanceBetweenHexes({ q: 0, r: -4 }, { q: 0, r: 4 })).toBe(8);
  });

  it("isAdjacent agrees with distance === 1", () => {
    expect(isAdjacent({ q: 0, r: 0 }, { q: 1, r: 0 })).toBe(true);
    expect(isAdjacent({ q: 0, r: 0 }, { q: 2, r: 0 })).toBe(false);
  });

  it("hexKey round-trips", () => {
    expect(hexKey(-3, 2)).toBe("-3,2");
  });

  it("pixelToAxial inverts axialToPixel for every valid hex", () => {
    const size = 34;
    for (const hex of enumerateBoardHexes(4)) {
      const { x, y } = axialToPixel(hex.q, hex.r, size);
      expect(pixelToAxial(x, y, size)).toEqual(hex);
    }
  });
});
