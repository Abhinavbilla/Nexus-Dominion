import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runMatch, loadBaseConfig } from "./Simulator.js";
import { createAggregator, addResult, summarize, toCsv } from "./Metrics.js";

export const DEFAULT_MATCHUPS = [
  ["strategic", "random"],
  ["strategic", "greedy"],
  ["greedy", "random"],
  ["strategic", "greedy", "random"],
];

// Runs `games` deterministic matches (seeds 1..games) for one set of AI types.
// Seat assignment rotates each game so no AI keeps the same starting corner;
// metrics are attributed to AI type, not seat.
export function runMatchup({ types, games, mode = "normal", baseConfig = loadBaseConfig() }) {
  const agg = createAggregator();
  let totalRounds = 0;
  let draws = 0;
  const seatWins = types.map(() => 0);

  for (let seed = 1; seed <= games; seed++) {
    const rot = seed % types.length;
    const seating = types.map((_, i) => types[(i + rot) % types.length]);
    const result = runMatch({ seed, aiTypes: seating, mode, baseConfig });
    addResult(agg, result);
    totalRounds += result.rounds;
    if (result.winnerIndex === null) draws++;
    else seatWins[result.winnerIndex]++;
  }

  return { types, mode, ...summarize(agg, { games, totalRounds, draws }), seatWinRates: seatWins.map((w) => w / games) };
}

export function runBenchmark({ games = 500, mode = "normal", matchups = DEFAULT_MATCHUPS } = {}) {
  const baseConfig = loadBaseConfig();
  return matchups.map((types) => runMatchup({ types, games, mode, baseConfig }));
}

function parseArgs(argv) {
  const args = { games: 500, mode: "normal", out: resolve(fileURLToPath(new URL(".", import.meta.url)), "results") };
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = key === "games" ? Number(argv[i + 1]) : argv[i + 1];
  }
  return args;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { games, mode, out } = parseArgs(process.argv.slice(2));
  const results = runBenchmark({ games, mode });
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, "benchmark.json"), JSON.stringify(results, null, 2));
  const csvRows = results.flatMap((m) =>
    m.rows.map((r) => ({ matchup: m.types.join(" vs "), games: m.games, draws: m.draws, avgRounds: m.avgRounds, ...r }))
  );
  writeFileSync(resolve(out, "benchmark.csv"), toCsv(csvRows));
  for (const m of results) {
    console.log(`\n${m.types.join(" vs ")}  (${m.games} games, ${m.draws} draws, avg ${m.avgRounds.toFixed(1)} rounds)`);
    console.table(
      m.rows.map((r) => ({
        ai: r.ai,
        winRate: r.winRate.toFixed(3),
        dominion: r.avgDominion.toFixed(1),
        territory: r.avgTerritory.toFixed(1),
        chains: r.avgChainsCompleted.toFixed(2),
        attacksWon: r.avgSuccessfulAttacks.toFixed(2),
        ms: r.avgDecisionMs.toFixed(2),
      }))
    );
    console.log("Seat win rates (starting corner):", m.seatWinRates.map((w) => w.toFixed(3)).join(" "));
  }
  console.log(`\nResults written to ${out}`);
}
