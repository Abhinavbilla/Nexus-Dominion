// Aggregates match results into the per-AI metrics required by spec.md §54.
export function createAggregator() {
  return new Map();
}

function bucket(map, key) {
  if (!map.has(key)) {
    map.set(key, {
      seats: 0,
      wins: 0,
      dominion: 0,
      territory: 0,
      chains: 0,
      attacksSucceeded: 0,
      attacksLaunched: 0,
      decisionMs: 0,
    });
  }
  return map.get(key);
}

export function addResult(agg, result) {
  result.players.forEach((p, i) => {
    const b = bucket(agg, p.ai);
    b.seats += 1;
    if (result.winnerIndex === i) b.wins += 1;
    b.dominion += p.dominionPoints;
    b.territory += p.territory;
    b.chains += p.stats.chainsCompleted;
    b.attacksSucceeded += p.stats.attacksSucceeded;
    b.attacksLaunched += p.stats.attacksLaunched;
    b.decisionMs += p.avgDecisionMs;
  });
}

export function summarize(agg, { games, totalRounds, draws }) {
  const rows = [];
  for (const [ai, b] of agg) {
    rows.push({
      ai,
      seats: b.seats,
      winRate: b.wins / b.seats,
      avgDominion: b.dominion / b.seats,
      avgTerritory: b.territory / b.seats,
      avgChainsCompleted: b.chains / b.seats,
      avgSuccessfulAttacks: b.attacksSucceeded / b.seats,
      avgDecisionMs: b.decisionMs / b.seats,
    });
  }
  return { games, draws, avgRounds: totalRounds / games, rows };
}

export function toCsv(rows) {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const fmt = (v) => (typeof v === "number" ? Number(v.toFixed(4)) : v);
  return [headers.join(","), ...rows.map((r) => headers.map((h) => fmt(r[h])).join(","))].join("\n");
}
