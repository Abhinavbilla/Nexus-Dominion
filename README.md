# NEXUS: DOMINION

A turn-based territorial strategy game for 2–4 players that runs in the browser. You claim hexes, build
Factories and Cities, link them into **Supply Chains**, and fight over the map with combat that has no dice
in it. Friends play over the internet with a five-letter room code. If you don't have friends online you play
against computer opponents that can tell you *why* they made each move.

**Play it now: <https://nexus-dominion.onrender.com>**
(hosted on a free plan, so if nobody has visited for a while the first load can take up to a minute to wake up)

I built it as a full-stack project: a server that is the single source of truth, a rule engine shared between
the server and the browser, a Phaser-rendered board inside a React interface, three AI opponents, and a
simulation harness I used to balance the rules with data instead of gut feeling.

If you only read one thing, read [Why it's built the way it is](#why-its-built-the-way-it-is) and
[Problems I ran into](#problems-i-ran-into-and-how-i-fixed-them). The
[interview questions](#questions-i-expect-to-be-asked) at the end are written to be said out loud.

---

## Contents

1. [What the game is](#what-the-game-is)
2. [How a match works (the rules)](#how-a-match-works-the-rules)
3. [Tech stack](#tech-stack)
4. [Architecture](#architecture)
5. [Why it's built the way it is](#why-its-built-the-way-it-is)
6. [The interesting algorithms](#the-interesting-algorithms)
7. [The AI opponents](#the-ai-opponents)
8. [Multiplayer: rooms, hosts, reconnection](#multiplayer-rooms-hosts-reconnection)
9. [Balance work and results](#balance-work-and-results)
10. [How the project evolved](#how-the-project-evolved)
11. [Problems I ran into and how I fixed them](#problems-i-ran-into-and-how-i-fixed-them)
12. [The visual and audio side](#the-visual-and-audio-side)
13. [How it compares to other games](#how-it-compares-to-other-games)
14. [Testing](#testing)
15. [Running it, benchmarking it, deploying it](#running-it-benchmarking-it-deploying-it)
16. [Project layout](#project-layout)
17. [Limitations and what I'd do next](#limitations-and-what-id-do-next)
18. [Questions I expect to be asked](#questions-i-expect-to-be-asked)
19. [Credits and licences](#credits-and-licences)

---

## What the game is

The board is a hexagon made of 61 hexes (radius 4). Every hex has one of five terrains:

| Terrain | Count | What it does |
|---|---|---|
| Plains | 25 | Open ground. Can hold a Factory or a City. A Factory here gives +1 Energy. |
| Forest | 11 | Produces **Wood** every round. |
| Mine | 11 | Produces **Metal** every round. |
| Energy Field | 9 | Produces **Energy** every round. |
| City Site | 5 | Worth double Dominion to claim; a good place for a City. |

Each player starts with one hex holding a permanent **Command Hub**, on the corners of the board. You win by
reaching the **Dominion** target (the score). Dominion comes from claiming land, capturing enemy land, building
Cities and, above all, from **Supply Chains**: connect a Factory on a resource hex to one of your Cities through
an unbroken path of your own hexes and it pays you again and again. An enemy that captures any hex in the path
breaks the chain, which is the whole fight over the map in one sentence.

The design goals I wrote down at the start and kept coming back to:

- **No luck in the core rules.** Combat is a comparison of two numbers. Board generation is seeded and checked
  for fairness. Randomness only appears where it should (which seed you get, which player a host handover picks).
- **Everything the player needs is on screen.** No scrolling, no hidden rules, the AI explains itself.
- **Fair by measurement.** Whether the seats are fair is a statistical question, so I answer it with simulations.
- **Playable in a browser with a link.** No install, no accounts.

---

## How a match works (the rules)

All numbers live in [`gameConfig.json`](gameConfig.json). Nothing below is hard-coded in the engine.

**Turns and rounds.** On your turn you get **2 actions** and **30 seconds**. A **round** is one full cycle in
which every player takes exactly one turn. At the start of each round everyone's hexes produce resources and
active Supply Chains pay out. The starting player rotates every round so nobody always goes first.

**Actions** (each costs one action):

| Action | Cost | Effect |
|---|---|---|
| Claim | free | Take a neutral hex next to your territory. +1 Dominion (+2 on a City Site). |
| Build Factory | 3 Wood, 2 Metal, 1 Energy | Doubles a resource hex's output; one end of a Supply Chain. |
| Build Fortress | 2 Metal, 1 Energy | +3 Defense on that hex. |
| Build City | 4 Wood, 4 Metal, 2 Energy | +3 Dominion; the other end of a Supply Chain. Max 2 per player. |
| Attack | 3 Metal, 2 Energy | Capture an adjacent enemy hex if Attack ≥ Defense. |
| Fortify | 2 Metal, 1 Energy | +1 Defense on one of your hexes (max level 3). |

You start with 6 Wood, 4 Metal and 4 Energy.

**Combat is deterministic.** Attack strength is 4, plus 1 if you own at least two hexes touching the target,
plus 1 if you have an active Supply Chain (capped at 6). Defense is 3, plus 3 for a Fortress, plus 2 for a City,
plus 1 per Fortify level. Attack ≥ Defense wins: you take the hex, its building is destroyed, and you score
+2 Dominion (+3 for a City Site, +4 for an enemy City). Lose, and you only spend the cost. Command Hubs cannot be
attacked. The attack preview shows both numbers before you commit, so nobody ever attacks blind.

**Supply Chains.** A Factory on a Forest, Mine or Energy Field is a *source*. A City is a *sink*. If your own hexes
connect them, the chain is active: **+4 Dominion** the first time you ever complete one, **+2** for each further
chain, then **+2 resources** of that type and **+1 Dominion every round** while it stays connected.

**Winning.** The Dominion target depends on the number of players: **200 (2 players), 120 (3), 90 (4)**. When someone
reaches it the match enters a *final round*. Everyone finishes the round so every player has had the same number
of turns, and then the highest Dominion wins. Ties are broken by hexes owned, then Cities, then total resources;
if all of those are equal it is a draw. There is **no round limit**. Only the target ends a match.

**Match length.** I aimed for 30–40 minutes. That figure is an estimate built from simulated round counts and a
guessed human turn length. I have not timed a group of humans, so treat it as a design target, not a result.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Server | Node.js + Express + **Socket.IO** | Real-time, bidirectional, rooms built in, automatic fallback transports. |
| Shared rules | Plain ES modules in `shared/` | The same validation and combat code runs in the browser (for instant UI feedback) and on the server (for authority). |
| Client UI | **React 18** + **Zustand** | Panels, forms and lobbies are UI state; Zustand keeps a read-only mirror of server state with almost no boilerplate. |
| Board | **Phaser 3** | Hardware-accelerated 2D, tweens and particles. Far better than the DOM for a hex board with animation. |
| Build | Vite, npm workspaces | Fast dev server; one repo with `shared`, `server`, `client`. |
| Tests | Vitest | Same ES-module setup as the code; runs in about a second. |
| Fonts / icons | Fontsource (Cinzel, Barlow, JetBrains Mono), game-icons.net, Phosphor | Bundled locally so the game works offline. |
| Hosting | Docker + a Render blueprint (or a temporary tunnel) | One container serves the API, the sockets and the built client. |

No database. Rooms and matches live in memory, which is a deliberate trade-off covered under
[Limitations](#limitations-and-what-id-do-next).

---

## Architecture

```
          browser (React + Phaser)                              server (Node)
 ┌─────────────────────────────────────┐           ┌──────────────────────────────────┐
 │ React UI  ◄── Zustand store (mirror)│           │ RoomManager  (lobbies, hosts)    │
 │   HUD, actions, panels, guide       │  events   │ GameEngine   (match lifecycle)   │
 │ Phaser scene (board, effects)       │◄─────────►│ ActionProcessor (the rules)      │
 │ shared/validation, combat (preview) │ Socket.IO │ TurnManager, ResourceManager     │
 └─────────────────────────────────────┘           │ AIController (drives AI seats)   │
                                                   │ shared/ (same rule code)         │
                                                   └──────────────────────────────────┘
                                         simulation/  (headless matches, AIs, benchmarks)
```

Three rules hold the design together:

1. **The server is authoritative.** The browser never changes game state. It sends an *intent* ("claim hex
   (2,-1)"), the server validates it against the real state, applies it and broadcasts the new state. A modified
   client can ask for anything and the server will still say no to an illegal move.
2. **The rules are shared code.** `shared/validation.js`, `combat.js`, `supplyChain.js` and `hexMath.js` are pure
   functions with no I/O. The browser imports them to highlight legal hexes and preview attacks; the server imports
   them to enforce the same rules. One implementation means the UI can never promise something the server refuses.
3. **State is replaced, not patched.** After every accepted action the server sends the *full* authoritative
   state. The client overwrites its mirror. There are no deltas to get out of sync (decision 9 in
   [`decisions.md`](decisions.md)).

Every action goes through the same pipeline, in this order:
`validate → spend resources → spend action → apply → recalculate Supply Chains → award Dominion → check victory →
record event → broadcast`.

---

## Why it's built the way it is

These are the decisions I'd defend. The full register, including the ones I reversed, is in
[`decisions.md`](decisions.md).

**Server-authoritative instead of peer-to-peer or client-trusting.** Anything the client decides can be cheated.
A game with hidden resource counts and turn timers has to be decided in one place. It also made reconnection
trivial: the server already has the truth, so a returning player just gets a fresh snapshot.

**Socket.IO instead of raw WebSockets** (a decision I changed from the first draft). Rooms, acknowledgements,
reconnection and fallbacks come for free, and the project is about the game, not about reinventing a transport.

**Full-state snapshots instead of deltas.** The whole state is a few kilobytes (61 hexes and a few players).
Sending it all each time removes an entire class of desync bugs, makes reconnects a one-liner, and lets the
client animate by *diffing* old and new state instead of needing special animation messages.

**Deterministic combat.** I wanted every loss to be explainable. When a player loses an attack it is because
they chose to attack at 4 vs 7, not because of a roll. It also makes the AI testable and the simulations
reproducible.

**Seeded randomness.** Boards come from a seeded generator (mulberry32). The same seed always produces the same
board, which let me replay and compare simulated matches exactly.

**A config file for every number.** Costs, rewards, victory targets, AI weights: all in one JSON file validated
at startup. That is what made the balance experiments cheap: a sweep is "change one number, run 500 matches".

**An AI that is not an LLM.** The spec explicitly says so, and I agree: a heuristic AI is deterministic,
benchmarkable, fast (well under a millisecond per decision), cannot produce an illegal move, and can show the
*actual* calculation behind its choice. An LLM would be none of those things.

**Phaser inside React, with a one-way bridge.** React owns the UI and the Zustand store. Phaser owns the board.
React hands Phaser the new state and the set of legal target hexes; Phaser reports back hover and click. Neither
reaches into the other's internals.

**Round-end victory.** When I measured fairness (see below), instant victory gave the first player of the final
round a measurable advantage. Making everyone finish the round fixed it.

---

## The interesting algorithms

**Hex coordinates.** Axial coordinates `(q, r)` with a fixed neighbour order so every traversal is deterministic.
Pointy-top hexes; conversion to pixels and back uses cube-coordinate rounding so a mouse click snaps to the right
hex. All of it is in `shared/hexMath.js`, covered by 8 tests.

**Fair board generation.** Terrain counts are fixed (25/11/11/9/5), but where they land is random, so some seeds
would be unfair. The generator builds a board from the seed, then **checks fairness**: for every starting position,
the distance to the nearest resources must be within a bound, and the sums of those distances may differ by at
most a small amount between players. If the board fails, it derives the next seed (`seed + 0x9E3779B9`) and tries
again, up to 1000 attempts. The accepted seed is recorded, so the board is still reproducible.

**Supply-Chain detection.** For each Factory source, run a breadth-first search across the player's own hexes.
Among all reachable Cities, pick the **nearest**, and break ties **lexicographically** by `(q, r)`. Each source
yields at most one chain, and rewards are tracked per `(player, source)` so toggling a chain on and off cannot be
farmed for Dominion. The result is deterministic and runs on 61 hexes, so recomputing after every action is
effectively free.

**Combat.** `calculateAttackStrength`, `calculateDefenseStrength` and `resolveAttack` are three small pure
functions. The client preview and the server call the same ones.

**Turn order.** The turn order within a round is the player array rotated by an offset that advances each round.
Victory is flagged mid-round and resolved at the round boundary.

**Tile rendering.** Each terrain tile is painted once into a canvas (extruded hex, bevel, shaded surface, seeded
scenery) and registered as a Phaser texture, so drawing 61 tiles per frame is just 61 sprite draws.

---

## The AI opponents

Three types, all behind one interface `chooseAction(state, config, playerId)`:

| AI | How it chooses |
|---|---|
| **Random** | Uniformly picks any legal action. A baseline. |
| **Greedy** | Takes the action with the biggest immediate Dominion gain; resource gain only breaks ties. |
| **Strategic** | Scores every legal action with a weighted heuristic and takes the best. |

**Legal actions are generated with the same validators the server uses**, so the AI cannot propose an illegal
move. **The Strategic AI looks one action ahead**: it clones the state, applies each candidate through the real
`ActionProcessor`, and measures what changed. The features are named and their weights live in `gameConfig.json`:

`victory (winning move) · dominionGain · resourceGain (income) · chainCompletion · chainDisruption ·
defensiveValue · threatProximity · expansionValue · denyLeader · captureSwing · resourceCost`

**Explainability.** The "Why?" button shows the exact table the AI computed: each feature, its value, its
weight, its contribution and the total, plus the runner-up moves. It is not a story generated afterwards. It *is*
the calculation, which is the point of choosing a heuristic over a language model.

**A bug worth mentioning:** both AIs originally broke score ties by board iteration order, which quietly favoured
whichever player owned the lowest-numbered hexes. I found it because the seat win rates were skewed in a mirror
match, and fixed it by choosing randomly among equal scores with the seeded generator (reservoir sampling in the
Greedy AI).

---

## Multiplayer: rooms, hosts, reconnection

- **Rooms.** Five-character codes (no `0/O/1/I`). Up to four seats, humans and AIs mixed. No accounts.
- **Host.** The creator is the host. Only the host can add AIs, remove players, kick during a match and start the
  game. Starting is blocked while any human is *not present*, and the lobby shows who is.
- **Host handover.** If the host leaves, a **random** remaining human becomes host and the room stays open. If the
  host's connection merely drops, they get **20 seconds** to come back before the role moves (so a page refresh
  doesn't hand the room away).
- **Reconnection.** Identity is a `(roomCode, playerId, reconnectToken)` triple kept in `sessionStorage`. A room
  code alone never identifies a player. A disconnected player's turns end when their timer runs out; nothing is
  reset.
- **Leaving a match.** Your hexes stay, your turns are skipped. If only one participant is left they win by
  forfeit. If no human is left the room is closed (otherwise AI-only matches would run forever, now that there is
  no round limit). The same code path serves both "I left" and "the host removed me", which is why a removed
  player can't rejoin that match but isn't banned from the room.
- **Rematch.** After a match, pressing Rematch returns *everyone who hasn't left* to the same room's lobby. The
  host starts the next match once everyone is present.

Protocol, client → server: `create_room, join_room, add_ai, remove_player, start_game, action, end_turn,
reconnect_player, chat_message, rematch_vote, leave_match, kick_player, leave_room`.
Server → client: `room_created, room_joined, player_joined, player_left, game_started, action_result, state_sync,
timer_tick, chat_message, ai_explanation, back_to_lobby, kicked, player_disconnected, player_reconnected, error`.

---

## Balance work and results

Most of the interesting engineering in this project is *measuring* the game. The harness in `simulation/` plays
complete matches headlessly and deterministically, then aggregates win rate, Dominion, territory, Supply Chains,
successful attacks, decision time and match length.

### AI strength (500 matches per matchup, seats rotated)

After the final reward tuning:

| Matchup | Result |
|---|---|
| Strategic vs Random | Strategic wins **100%** |
| Greedy vs Random | Greedy wins **99.8%** |
| Strategic vs Greedy | Strategic **63.2%**, Greedy 36.8% |
| Strategic, Greedy and Random together | Strategic **61.8%**, Greedy 38.2%, Random 0% |

Average decision time (per action): Random ≈ 0.02 ms, Greedy ≈ 0.15 ms, Strategic ≈ 0.3 ms.

The Strategic AI started *worse* than Greedy (13 wins to 46 in a 60-match test) because it priced resources too
highly and almost never attacked. Lowering the resource-cost weight and adding a capture feature took it to
roughly even, and then the reward change below pushed it ahead.

### Rewards: combat was pointless

A breakdown of where Dominion came from showed claims and Supply Chains produced almost everything while combat
produced about one capture per game. A capture cost an action *plus* 5 resources for the same +1 that a free claim
gave. I tested raising capture rewards:

| Capture / enemy-City reward | Captures per player | Strategic's win rate vs Greedy |
|---|---|---|
| 1 / 3 (original) | 0.58 | 64% |
| **2 / 4 (chosen)** | **1.58** | **74%** |
| 3 / 5 | 1.51 | 77% |

I chose 2/3/4 (normal / City Site / enemy City): nearly triple the fighting without making matches much shorter.

### Fairness: who wins, by seat?

The fair test is a **mirror match**: the same AI in every seat, so any difference between seats comes from the rules
or the board, not the players. I ran 600–1500 matches per case and applied a chi-square test against "every seat
equally likely".

Before fixing anything:

| Players | Win % by seat | Verdict |
|---|---|---|
| 2 | 59 / 41 | skewed |
| 3 | 37 / 24 / 39 | skewed |
| 4 | 28 / 33 / 17 / 21 | skewed |

Three separate causes, three fixes:

1. **First-mover advantage.** A match ended the instant someone reached the target, so whoever moved first in the
   deciding round won more often. → **Round-end victory**: everyone finishes the round.
2. **Isolated start corner (3 players).** With three players one seat was far from everyone and another was next
   to a neighbour. → Three players now start on alternating corners, all equally far apart.
3. **AI tie-break bias** (above). → Random tie-breaks.

After the fixes (Strategic mirror): 2 players **50.8 / 49.0**, 3 players **35.1 / 31.4 / 33.4**, 4 players
**25.8 / 27.5 / 20.8 / 25.8**, all passing the chi-square test. A larger 1500-match sample also showed that a
small 3/4-player skew I saw in a 500-match run was mostly noise, which is why sample size matters.

### Match length

Early versions ended in roughly 9–10 rounds, which is too short for a strategy game. I raised the target, found it
scaled badly with player count (four players means four times as many turns per round), and so made the victory
target depend on player count. I also added **+1 Dominion per active Supply Chain per round**, because without
passive income a long game stalls once the board is full. Honest caveat: after the last retargeting (200 / 120 /
90) I did not re-run the full simulation, and the AI scores faster than people do, so the "30–40 minutes"
figure is an *estimate*, not a measurement.

---

## How the project evolved

The git history is short and honest, so here it is as a story:

1. **Design first (day one).** Before any code I wrote a ~2,900-line specification, a decision register and an
   analysis document (hex math, data model, protocol, risks, a ten-phase plan). Twelve decisions are recorded
   with what changed from the first draft and why. Examples: Plains + Factory can't be a Supply Chain source;
   the Command Hub occupies its slot and can't be attacked; one chain per source with deterministic shortest-City
   selection; full-state sync.
2. **Milestone 1: a playable core.** Server-authoritative engine (board, resources, buildings, Supply Chains,
   combat, turns, victory), Socket.IO rooms, a React + Phaser client, an in-room chat, an attack preview and a
   victory screen, with 46 unit tests over the shared rules. Validated with a scripted two-client run through a
   whole match.
3. **AI and measurement.** Random, Greedy and Strategic AIs, a headless simulator, a benchmark runner and a
   balance-sweep tool. This is where the combat-reward problem showed up.
4. **Fairness.** The mirror-match analysis, round-end victory, the three-player layout, the tie-break fix.
5. **Real-browser testing.** I drove the game in an actual browser and found things unit tests can't:
   a chat button pushed off-screen, a log that clipped, an attack-confirm button below the fold, a Phaser crash
   under React StrictMode, a session that wasn't restored on page reload, a layout that collapsed on phones.
6. **Presentation.** Procedurally painted terrain tiles and buildings, a nebula backdrop, synthesized sound
   effects with measured levels, an icon system, a redesign of every screen.
7. **Making it learnable.** An illustrated how-to guide (also available mid-match), a hint bar that says what you
   can do right now, a first-game coach, and a one-screen layout that never scrolls.
8. **Longer matches.** Per-player-count victory targets, passive chain income, a 30-second turn, and removing the
   round limit.
9. **Match lifecycle.** Exit with confirmation, rematch back to the lobby with a presence check, host-only
   removal, random host handover, kicking during a match.
10. **Deployment and polish.** Docker image, Render blueprint, a public tunnel for friends, then a final UI
    pass to remove decoration that made it feel generic (flush panels, flat controls).

Specs and amendments live in [`spec.md`](spec.md), [`decisions.md`](decisions.md) and [`analysis.md`](analysis.md).

---

## Problems I ran into and how I fixed them

**Seat advantage that wasn't obvious.** The AI mirror match showed 59/41. It took three separate investigations
(turn order, board geometry, AI tie-breaking) to explain all of it. The lesson: measure first, don't guess.

**Combat nobody used.** The numbers said so; the reward table fixed it.

**React StrictMode vs Phaser.** In development React mounts, unmounts and re-mounts components, which destroyed a
Phaser game before it had finished booting and threw `Cannot read properties of null (reading 'renderer')`. The fix:
if the game isn't booted yet, wait for its `READY` event before destroying it. A related one: icon images loaded
asynchronously and tried to add textures to a scene that was already gone, so the loader now checks the scene is
still alive.

**Identity lost on refresh.** The reconnect handshake restored the *server* side but never put the player id back
into the client store, so `isMyTurn()` was false after a reload. The client now restores its session before asking
the server for the state.

**CSS that "didn't work".** A tooltip positioned with `position: absolute` rendered in the wrong place, because a
global `.glass-panel { position: relative }` loaded *after* the component's stylesheet and won the cascade. The
fix was specificity, and later I made a dedicated stylesheet that loads last on purpose.

**Phaser pauses in background tabs.** My two-player browser tests failed until I realised one of the two tabs was
in the background, where Phaser stops processing input. Test harnesses now bring the tab to the front.

**Layout that scrolled.** Panels stacked in one column pushed the confirm-attack button off the screen. The
redesign gives each kind of option a fixed slot (actions, one contextual panel, status, chat) so nothing scrolls
at 1366×768.

**Rooms that could never end.** Removing the round limit meant an all-AI room would run forever once the last
human left. The server closes a room as soon as no human remains.

**Running tests in the environment.** `npm test` failed because of an unrelated npm shell setting on the dev
machine, so I run Vitest directly. Worth knowing if `npm test` misbehaves for you.

---

## The visual and audio side

There are no art files in the repository. Everything is generated at load time.

- **Terrain:** five terrains × three variants, each a canvas drawing with a bevel, an extruded edge and scenery from
  a seeded generator (pines and oaks, mountains with a timber mine entrance, crystal fields with animated
  lightning, paved city sites).
- **Buildings:** 2.5D sprites built from boxes and cylinders, with trim in the owner's colour: Command Hub, Factory
  (with animated smoke), Fortress, City.
- **The base:** a stepped, terraced plinth with brass trim and corner studs.
- **Atmosphere:** drifting cloud shadows, twinkling stars, soft glow under buildings, income numbers floating up from
  producing hexes at the start of each round, attack beams and impact rings.
- **Resource icons:** painted tokens (stacked logs, steel ingots, a glass energy orb) instead of flat glyphs.
- **Audio:** a small Web Audio synthesizer (layered oscillators, a shared echo bus and a compressor). Because I
  can't verify taste in a test, I rendered every sound offline and measured peak level, loudness, length, clipping
  and start clicks, then balanced them to within a few dB. WAV previews are in `sound-preview/`.
- **Typography and layout:** Cinzel for titles, Barlow Condensed for labels, JetBrains Mono for numbers. The
  in-game screen is flush panels separated by 1px rules.

I replaced hand-drawn icons with the game-icons.net and Phosphor sets after they looked amateurish next to the
rest, and later removed a lot of decorative icons because an icon on every heading and button looks generated.

---

## How it compares to other games

I'm comparing *design choices*, not claiming to be a better product than anything that ships with a studio and
years of work.

- **Compared with dice-driven board games (Catan and similar).** Their luck is the point; mine isn't. Combat and
  production are deterministic, so skill decides, and the game can show you exactly why you lost a fight.
- **Compared with large 4X strategy games (Civilization-style).** Those take hours and hide complexity. This is a
  single small board with five numbers per fight, designed to be learnable in one match and finished in a sitting.
- **Compared with typical browser hex games and student projects.** Most are client-trusting, single-screen or
  hot-seat. This one has an authoritative server, reconnection, host management, a rematch flow, headless
  simulation and a statistically checked fairness model.
- **What's distinctive:** (1) explainable AI that shows its real score table, (2) rules tuned by measurement, with
  the experiments recorded, (3) one shared rule implementation on both client and server, (4) a UI that teaches
  the game from inside the game, (5) no art assets: the visuals and sounds are code.

---

## Testing

**52 automated tests** (Vitest), in six files:

| File | Tests | What it covers |
|---|---|---|
| `hex.test.js` | 8 | Coordinates, neighbours, distance, pixel conversion |
| `board.test.js` | 7 | Terrain counts, determinism, fairness checks |
| `combat.test.js` | 8 | Attack/defense strength, caps, resolution |
| `supplyChain.test.js` | 6 | Valid, broken and restored chains, tie-breaking |
| `validation.test.js` | 17 | Every action's legality rules and error messages |
| `ai.test.js` | 6 | Legal-action generation, explanation totals, no state mutation, determinism, every AI finishes a match |

Beyond unit tests:

- **Headless simulations** (`simulation/`) play whole matches and are deterministic per seed.
- **Socket-level scenario scripts** exercised the multiplayer lifecycle with real clients: leaving mid-match,
  forfeit wins, rematch flows, host handover, the 20-second grace period, host-only removal, kicking, presence
  checks.
- **Real-browser runs** drove the actual UI (lobby, claiming, building, attacking, Supply Chain completion, victory,
  reload and reconnect, phone width) and checked screenshots.

What is *not* covered: there is no committed end-to-end UI test suite (the browser scripts were one-off), audio was
verified by measurement and not by ear, and I have not run structured playtests with people.

---

## Running it, benchmarking it, deploying it

You need Node 18+.

```bash
npm install

# development: server on :3001 and the Vite client with hot reload
npm run dev

# production-style: build the client, then one process serves everything on :3001
npm run build
npm start

# tests (if `npm test` misbehaves on Windows, run: node node_modules/vitest/vitest.mjs run)
npm test

# simulations
npm run benchmark                         # 500 matches per matchup -> simulation/results/benchmark.{json,csv}
node simulation/Benchmark.js --games 100  # smaller run
npm run balance                           # parameter sweeps -> simulation/results/balance.{json,csv}
```

**Playing:** open the page, enter a name, create a room, add AI opponents or send the code to friends, start.
Keys in a match: `C` claim, `B` build, `A` attack, `F` fortify, `E` end turn, `Esc` cancel, `H` or `?` for the
rules.

**Live deployment.** The game is hosted on Render at <https://nexus-dominion.onrender.com> as a Docker web
service built from this repository's `main` branch; every push redeploys it automatically, which also ends any
match in progress.

**Deploying permanently.** The `Dockerfile` builds the client and starts the server. `render.yaml` is a Render
blueprint: push the repo to GitHub, create a Blueprint in Render and point it at the repository. The free plan
sleeps after about 15 minutes idle, so the first visit afterwards is slow.

**Sharing quickly from your own machine.** Run the server, then use a tunnel such as Cloudflare's quick tunnel
(`cloudflared tunnel --url http://localhost:3001`). It gives a temporary public address and works only while your
computer is on.

**Configuration.** Everything is in `gameConfig.json`: board size, terrain counts, fairness bounds, start positions,
costs, combat values, Dominion rewards, victory targets per player count, turn length, AI weights.

---

## Project layout

```
shared/        pure rules used by both sides: hexMath, boardGenerator, validation, combat, supplyChain, gameConfig
server/        index.js (sockets), RoomManager, GameEngine, ActionProcessor, TurnManager, ResourceManager, AIController
simulation/    Simulator, Benchmark, BalanceExperiment, Metrics, ai/ (Random, Greedy, Strategic, legal actions, features)
client/src/
  game/        Phaser scene, camera, effects, art/ (tiles, buildings, backdrop, resource icons)
  ui/          React screens and panels (HUD, action bar, lobby, guide, victory, ...)
  state/       Zustand store (read-only mirror of server state)
  networking/  Socket.IO client and event wiring
  audio/       Web Audio sound synthesis
tests/         Vitest suites
gameConfig.json   every game number
spec.md / decisions.md / analysis.md   the design documents
```

About 12,000 lines of code across the five code folders, plus roughly 4,000 lines of design documentation.

---

## Limitations and what I'd do next

Being straight about the edges:

- **State is in memory.** A server restart ends every match. Fine for a game night, wrong for a service. The
  fix is to persist match state (for example Redis) and move rooms out of process.
- **One server process.** There's no horizontal scaling. Sockets would need a shared adapter and sticky routing.
- **Free hosting sleeps.** Fine for friends, not for a public launch.
- **No accounts, ranking or history.** Anyone with a room code can join. Rooms are only as private as the code.
- **The Strategic AI looks one action ahead.** It is explainable but not deep; a search-based AI would play
  better and explain less.
- **Match-length figures are estimates.** I'd want real playtests to tune the victory targets.
- **No automated end-to-end UI tests.** The browser verification was manual and scripted once.
- **Audio** was balanced by measurement; a human ear should still tune it.

Next steps, in order: persistence and reconnect across server restarts, a playtest round to tune length and
rewards with real data, an AI with a two-move lookahead, a spectator mode, and replays (the seeded determinism
and the event log already make them possible).

---

## Questions I expect to be asked

**What is the project in one sentence?**
A browser-based, server-authoritative hex strategy game for 2–4 players where Supply Chains drive scoring,
combat is deterministic, and the balance was tuned with simulations.

**Why did you make the server authoritative?**
Because anything the client decides can be cheated, and because it makes reconnection simple: the server always has
the truth and a returning player just receives the current state.

**What is shared between the client and the server?**
The pure rule code: hex math, validation, combat, Supply Chain detection and config validation. The client uses it
to highlight legal hexes and preview attacks; the server uses it to enforce them. One implementation means the UI
can't promise something the server rejects.

**Why send the whole state instead of changes?**
The state is tiny, so the cost is negligible, and it removes desync bugs, makes reconnects trivial, and lets the
client animate by diffing two snapshots. I'd switch to deltas only if state grew large.

**Why Socket.IO?**
It gives rooms, reconnection and fallbacks out of the box. I originally planned raw WebSockets and changed it,
because the interesting problems are in the game, not the transport.

**How do you keep the game fair?**
Three layers: the board generator rejects unfair boards (resource distance and balance between start positions),
the rules are symmetric (the start order rotates each round and victory resolves at the end of a round), and I
verified the result statistically with mirror matches and a chi-square test.

**How did you find the first-player advantage?**
By running the same AI in every seat and looking at win rate per seat. 59/41 in a two-player match is far outside
what chance explains. Then I isolated causes one at a time and re-measured after each fix.

**What is a chi-square test and why use it here?**
It tests whether observed counts differ from the expected ones by more than chance. With N matches I expect each
seat to win N/players; the statistic sums (observed − expected)² / expected and I compare it with a critical value.
It stops me from "fixing" differences that are just noise, which a bigger sample later showed one of mine was.

**How do Supply Chains work algorithmically?**
For each Factory on a resource hex I run a breadth-first search over the player's own hexes. Among reachable Cities
I pick the nearest and break ties by `(q, r)` order, so the result is deterministic. Rewards are tracked per
(player, source) so a chain can't be farmed by breaking and reconnecting it.

**Why is combat deterministic?**
So skill decides outcomes, so every loss is explainable, and so the AI and the simulations are reproducible.

**How does the AI work?**
It generates every legal action, applies each to a copy of the state through the real action processor, turns the
change into named features, and scores them with configurable weights. The best score wins; equal scores are broken
at random. It can never play an illegal move because it uses the same validators as the server.

**Why not use an LLM as the AI?**
A heuristic is deterministic, fast, testable, can't cheat or hallucinate a move, and can show its real reasoning.
An LLM could be used later for a natural-language *description*, but never to decide moves.

**How can the AI explain itself honestly?**
The explanation is the score table the AI actually computed, shipped to the client as data. Nothing is generated
after the fact.

**What did you do about the combat nobody used?**
I broke down where Dominion came from and saw captures contributed almost nothing, because they cost an action plus
five resources for the same point a free claim gave. I tested higher capture rewards and chose 2/3/4, which almost
tripled captures and made the better AI win more.

**How do you handle disconnects?**
A player is identified by room code, player id and a secret reconnect token stored in `sessionStorage`. If they
drop, the match continues and their turn ends when the timer runs out. When they return, the server sends the
current state. If the host drops, they get 20 seconds before the role passes to someone else.

**What happens when someone leaves or is removed mid-match?**
Their hexes stay, their turns are skipped. If one participant remains they win by forfeit; if no human remains the
room closes. Leaving and being removed share one code path.

**How do the React UI and the Phaser board talk to each other?**
One way down, events up. React computes the legal target hexes and passes them with the state; Phaser draws and
animates. Phaser reports hover and click; React updates the store. Neither touches the other's internals.

**How do you animate without animation messages from the server?**
The client diffs the previous and new state, and also reads the new events in the event log (claim, build, attack,
round start) to drive effects like beams and income numbers.

**Why generate the art in code?**
No asset pipeline, no licensing for images, small repository, and every visual is tunable. The cost is that it's
time spent on drawing code. The game still works offline.

**What was the hardest bug?**
Probably the seat advantage, because it had three independent causes that hid each other. The most annoying one
technically was Phaser being destroyed mid-boot under React StrictMode.

**What would you change if this had thousands of users?**
Persist match state, move rooms out of process, use a shared Socket.IO adapter with sticky sessions, add accounts
and rate limiting, and put the static client behind a CDN.

**How did you test it?**
52 unit tests on the pure rules and the AI, headless simulations for balance, socket-level scenario scripts for
the multiplayer lifecycle, and real-browser runs with screenshots for the UI. I did not run structured playtests
with people yet and say so in the limitations.

**What are you proudest of?**
Treating balance as a measurement problem. Having the rules in one config file and a deterministic simulator meant
I could turn "this feels unfair" into a number, change one thing, and see whether the number moved.

**What would you do differently?**
Write the end-to-end browser tests as a real committed suite, and playtest with people earlier instead of relying
on AI matches to approximate human behaviour.

---

## Credits and licences

The code in this repository is released under the MIT licence (see [`LICENSE`](LICENSE)). Third-party assets keep their own licences:

- Gameplay icons: [game-icons.net](https://game-icons.net) by Lorc, Delapouite and contributors, licensed
  **CC BY 3.0**.
- Interface icons: [Phosphor Icons](https://phosphoricons.com), MIT.
- Fonts: Cinzel, Barlow, Barlow Condensed and JetBrains Mono through Fontsource (SIL Open Font Licence).
- Everything else, including the terrain, buildings, sounds and logo, is generated by code in this repository.
