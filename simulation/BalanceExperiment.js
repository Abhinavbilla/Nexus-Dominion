import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validateGameConfig } from "../shared/gameConfig.js";
import { loadBaseConfig, runMatch } from "./Simulator.js";
import { toCsv } from "./Metrics.js";

// Parameter sweeps (spec.md §55). Each experiment plays Strategic-vs-Strategic
// mirror matches so any seat skew or stall comes from the rules, not the AI mix.
export const EXPERIMENTS = [
  { name: "VICTORY_SCORE", path: ["modes", "normal", "VICTORY_SCORE"], values: [20, 25, 30, 40] },
  { name: "BASE_ATTACK", path: ["ATTACK_VALUES", "BASE_ATTACK"], values: [3, 4, 5] },
  { name: "SUPPLY_CHAIN_BONUS", path: ["RESOURCE_GENERATION", "supply_chain_bonus"], values: [1, 2, 3] },
  { name: "FORTRESS_BONUS", path: ["DEFENSE_VALUES", "FORTRESS_BONUS"], values: [1, 2, 3, 4] },
];

export function withOverride(baseConfig, path, value) {
  const raw = structuredClone(baseConfig);
  let node = raw;
  for (const key of path.slice(0, -1)) node = node[key];
  node[path[path.length - 1]] = value;
  return validateGameConfig(raw);
}

export function runExperiment({ experiment, games = 100, players = 2 }) {
  const base = loadBaseConfig();
  return experiment.values.map((value) => {
    const config = withOverride(base, experiment.path, value);
    const seatWins = Array(players).fill(0);
    let draws = 0;
    let rounds = 0;
    let finishedByScore = 0;
    for (let seed = 1; seed <= games; seed++) {
      const r = runMatch({ seed, aiTypes: Array(players).fill("strategic"), baseConfig: config });
      rounds += r.rounds;
      if (r.winnerIndex === null) draws++;
      else seatWins[r.winnerIndex]++;
      if (r.winReason === "dominion_threshold") finishedByScore++;
    }
    return {
      parameter: experiment.name,
      value,
      games,
      avgRounds: rounds / games,
      drawRate: draws / games,
      scoreVictoryRate: finishedByScore / games,
      ...Object.fromEntries(seatWins.map((w, i) => [`seat${i + 1}WinRate`, w / games])),
    };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const games = Number(process.argv[2]) || 100;
  const rows = EXPERIMENTS.flatMap((experiment) => runExperiment({ experiment, games }));
  const out = resolve(fileURLToPath(new URL(".", import.meta.url)), "results");
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, "balance.json"), JSON.stringify(rows, null, 2));
  writeFileSync(resolve(out, "balance.csv"), toCsv(rows));
  console.table(
    rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "number" ? Number(v.toFixed(3)) : v])))
  );
  console.log(`Results written to ${out}`);
}
