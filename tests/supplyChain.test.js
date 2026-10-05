import { describe, it, expect } from "vitest";
import { findSupplyChainsForPlayer } from "../shared/supplyChain.js";
import { BUILDING, TERRAIN } from "../shared/constants.js";

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

describe("findSupplyChainsForPlayer", () => {
  it("finds a valid chain: source+factory -> owned path -> city", () => {
    const board = makeBoard([
      { q: 0, r: 0, terrain: TERRAIN.MINE, ownerId: "p1", building: BUILDING.FACTORY },
      { q: 1, r: 0, ownerId: "p1" },
      { q: 2, r: 0, ownerId: "p1" },
      { q: 3, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
    ]);
    const chains = findSupplyChainsForPlayer(board, "p1");
    expect(chains).toHaveLength(1);
    expect(chains[0]).toMatchObject({
      sourceKey: "0,0",
      cityKey: "3,0",
      resourceType: "metal",
      active: true,
    });
    expect(chains[0].pathKeys).toEqual(["0,0", "1,0", "2,0", "3,0"]);
  });

  it("does not activate without a Factory on the source hex", () => {
    const board = makeBoard([
      { q: 0, r: 0, terrain: TERRAIN.MINE, ownerId: "p1", building: null },
      { q: 1, r: 0, ownerId: "p1" },
      { q: 2, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
    ]);
    expect(findSupplyChainsForPlayer(board, "p1")).toHaveLength(0);
  });

  it("breaks when an opponent captures the connecting hex", () => {
    const board = makeBoard([
      { q: 0, r: 0, terrain: TERRAIN.MINE, ownerId: "p1", building: BUILDING.FACTORY },
      { q: 1, r: 0, ownerId: "p2" }, // captured link
      { q: 2, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
    ]);
    expect(findSupplyChainsForPlayer(board, "p1")).toHaveLength(0);
  });

  it("restores once the connecting hex is reclaimed", () => {
    const board = makeBoard([
      { q: 0, r: 0, terrain: TERRAIN.MINE, ownerId: "p1", building: BUILDING.FACTORY },
      { q: 1, r: 0, ownerId: "p1" },
      { q: 2, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
    ]);
    expect(findSupplyChainsForPlayer(board, "p1")).toHaveLength(1);
  });

  it("picks the minimum-distance city, then lexicographically smallest (q,r) on ties", () => {
    // Two cities equidistant (distance 2) from the source: (2,0) and (0,2).
    // Lexicographic order: (0,2) < (2,0) since q=0 < q=2.
    const board = makeBoard([
      { q: 0, r: 0, terrain: TERRAIN.MINE, ownerId: "p1", building: BUILDING.FACTORY },
      { q: 1, r: 0, ownerId: "p1" },
      { q: 2, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
      { q: 0, r: 1, ownerId: "p1" },
      { q: 0, r: 2, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
    ]);
    const chains = findSupplyChainsForPlayer(board, "p1");
    expect(chains).toHaveLength(1);
    expect(chains[0].cityKey).toBe("0,2");
  });

  it("gives a source at most one active chain even with multiple reachable cities", () => {
    const board = makeBoard([
      { q: 0, r: 0, terrain: TERRAIN.MINE, ownerId: "p1", building: BUILDING.FACTORY },
      { q: 1, r: 0, ownerId: "p1" },
      { q: 2, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
      { q: -1, r: 0, ownerId: "p1" },
      { q: -2, r: 0, terrain: TERRAIN.CITY_SITE, ownerId: "p1", building: BUILDING.CITY },
    ]);
    const chains = findSupplyChainsForPlayer(board, "p1");
    expect(chains).toHaveLength(1);
  });
});
