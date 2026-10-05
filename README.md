# NEXUS: DOMINION

Multiplayer hex territorial strategy game (React + Phaser client, Node + Socket.IO authoritative server).
See `spec.md`, `decisions.md`, `analysis.md` for design.

## Run (development)
    npm install
    npm run dev          # server :3001 + client (Vite)

## Run (production / demo)
    npm run build        # builds client/dist
    npm start            # server serves the client on :3001
    docker build -t hex-dominion . && docker run -p 3001:3001 hex-dominion

## Play vs AI
Create a room, use **ADD AI** (random / greedy / strategic) in the lobby, start. After an AI moves, click
**WHY THIS MOVE?** to see the exact heuristic score breakdown.

## Tests, benchmarks, balance
    npm test                                    # Vitest rule/AI tests
    npm run benchmark                           # 500 games per matchup -> simulation/results/benchmark.{json,csv}
    node simulation/Benchmark.js --games 100    # smaller run
    npm run balance                             # parameter sweeps -> simulation/results/balance.{json,csv}

Simulations are deterministic per seed. AI weights live in `gameConfig.json` under `AI_WEIGHTS`.
