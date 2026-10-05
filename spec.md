```sh
# NEXUS: DOMINION
## Project Specification v2.0

> [!IMPORTANT]
> This specification is read together with `decisions.md`. Where the two differ,
> `decisions.md` is authoritative. Locked decisions and their clarifications are
> implementation requirements, not optional proposals.

---

# 1. PROJECT OVERVIEW

NEXUS: DOMINION is a browser-based 2–4 player multiplayer territorial strategy game played on a futuristic hexagonal battlefield.

Players compete to:

- expand territory,
- collect and manage resources,
- construct infrastructure,
- create resource supply chains,
- attack and defend strategic territories,
- and accumulate Dominion Points.

The game is intentionally small in mechanical scope but must have a high level of visual polish.

The project has three goals:

1. Build a genuinely playable multiplayer strategy game.
2. Demonstrate meaningful algorithmic and systems concepts.
3. Produce a project that can be defended clearly in a university viva.

The project must NOT be a clone of Catan, Risk, Civilization, or another existing board/strategy game.

The hexagonal grid is only a board representation. The game's core mechanics, scoring, objectives, resource system, combat system, and Supply Chain mechanic must be original to NEXUS: DOMINION.

---

# 2. PRIMARY DESIGN PRINCIPLES

The following principles are mandatory.

## 2.1 Small but Deep

The game must have a small number of mechanics that interact meaningfully.

Do not add features simply to increase the feature count.

Core systems:

- territory control
- resource generation
- infrastructure
- Supply Chains
- deterministic combat
- fortification
- turn management
- multiplayer synchronization
- strategic AI

---

## 2.2 Explainability

Every important game decision must be understandable.

Players must be able to determine:

- why a territory is valuable,
- why an attack succeeded or failed,
- why a Supply Chain is active,
- why an AI selected a particular action.

No unexplained randomness should determine important outcomes.

---

## 2.3 Deterministic Core Rules

The game must avoid dice-based resolution.

Given the same:

- game state,
- player actions,
- and configuration,

the result must be deterministic.

This makes the game easier to:

- test,
- reproduce,
- benchmark,
- debug,
- and defend in a viva.

---

## 2.4 Configurable Balance

Game-balance parameters must not be hard-coded throughout the application.

All important values must exist in one configuration file.

Examples:

TURN_DURATION
MAX_ROUNDS
VICTORY_SCORE
RESOURCE_GENERATION
BUILD_COSTS
ATTACK_COSTS
DEFENSE_VALUES
DOMINION_REWARDS
AI_WEIGHTS

Balance values may be adjusted after simulation and playtesting without changing core game logic.

---

# 3. GAME IDENTITY

## Title

NEXUS: DOMINION

## Genre

Multiplayer turn-based territorial strategy game.

## Platform

Web browser.

## Players

2–4.

## Game mode

Turn-based multiplayer.

## Match duration

Normal mode:
- Maximum 18 rounds.
- 25-second turn timer.
- 2 Action Points per player turn.

Target match duration:

Approximately 10–20 minutes.

The game may end earlier if a player reaches the victory threshold (the match then ends when that round completes; see §38).

---

# 4. WHY TURN-BASED MULTIPLAYER?

The game is intentionally turn-based.

### Design reason

The core gameplay involves:

- territorial planning,
- infrastructure placement,
- resource management,
- and tactical decisions.

Players need a short but meaningful decision period.

Turn-based interaction also provides:

- deterministic state transitions,
- simpler synchronization,
- easier validation,
- easier replay,
- easier debugging.

### Alternative considered

Real-time multiplayer.

### Why not use real-time?

Real-time gameplay would introduce additional complexity involving:

- continuous state synchronization,
- simultaneous actions,
- movement reconciliation,
- latency handling,
- race conditions.

That complexity does not contribute directly to the project's central gameplay mechanics.

The game therefore uses turn-based interaction.

---

# 5. WHY A HEXAGONAL BOARD?

The board uses hexagonal cells.

Each hexagon has six equally adjacent neighbors.

### Design reason

A hexagonal grid provides:

- uniform adjacency,
- no special treatment for diagonal movement,
- consistent movement distance,
- naturally connected territories,
- interesting strategic positioning.

### Alternative considered

Square grid.

### Tradeoff

Square grids are simpler to implement, but diagonal movement introduces an explicit design question:

- Is diagonal movement allowed?
- Is diagonal distance equal to orthogonal distance?

The hexagonal grid avoids this distinction because every neighboring cell is structurally equivalent.

### Implementation

Use axial coordinates:

(q, r)

Each hex has six possible neighbors:

(q + 1, r)
(q - 1, r)
(q, r + 1)
(q, r - 1)
(q + 1, r - 1)
(q - 1, r + 1)

This listed order is the canonical fixed axial-neighbor order for all BFS and
other deterministic traversal.

---

# 6. BOARD

## 6.1 Board Shape

Use a radius-4 hexagonal map.

A hex is valid when:

max(|q|, |r|, |q + r|) <= 4

This produces:

61 playable hexes.

The board is intentionally small enough to keep:

- gameplay readable,
- path calculations inexpensive,
- multiplayer state manageable,
- visual rendering polished.

---

## 6.2 Board Generation

The board must be deterministic using a match seed.

The same match seed must produce:

- the same board layout,
- the same terrain,
- the same starting positions.

This ensures that benchmark experiments are reproducible.

### Deterministic generation procedure

Use the Mulberry32 seeded PRNG. Enumerate the 61 valid axial coordinates in
canonical lexicographic `(q, r)` order. Reserve all four predefined starting
coordinates as Plains. Create the remaining token list: 21 Plains, 11 Forest,
11 Mine, 9 Energy Field, and 5 City Site. Shuffle it with Mulberry32 and assign
tokens in canonical coordinate order. Run the fairness test in §6.3.

On failure, derive the next seed deterministically as
`nextSeed = (seed + 0x9E3779B9) >>> 0` and repeat. The original seed is retained
as the match seed and the accepted derived seed is recorded as `boardSeed`, so
the same initial seed always produces the same final board.

---

## 6.3 Board Balance

Starting locations are fixed and generated terrain must pass a deterministic
fairness test. For every starting coordinate, the nearest Forest, Mine, and
Energy Field must each be at hex distance at most 3. The maximum difference
between any players' sums of those three distances must be at most 2.

Do not rely solely on unvalidated random placement.

---

# 7. STARTING POSITIONS

Use four predefined starting zones positioned approximately around the board.

Starting positions:

Player 1:
(-4, 0)

Player 2:
(4, 0)

Player 3:
(0, -4)

Player 4:
(0, 4)

When fewer than four players are present:

unused starting locations remain neutral.

Exception — three players:

Three players start on alternating board corners instead, so that no seat is
isolated or crowded (all pairwise distances are equal):

Player 1:
(4, 0)

Player 2:
(-4, 4)

Player 3:
(0, -4)

Configurable as `STARTING_POSITIONS_3P`. Two-player matches use Player 1 and
Player 2 positions above (opposite corners).

Players must not begin with immediately adjacent starting territories.

---

# 8. TERRAIN TYPES

There are exactly five terrain types in version 1.

## 8.1 PLAINS

Purpose:

- general-purpose territory
- suitable for Cities
- suitable for production structures

Resource production:

None.

---

## 8.2 FOREST

Resource:

Wood.

Base generation:

+1 Wood per round.

---

## 8.3 MINE

Resource:

Metal.

Base generation:

+1 Metal per round.

---

## 8.4 ENERGY FIELD

Resource:

Energy.

Base generation:

+1 Energy per round.

---

## 8.5 CITY SITE

Strategic territory.

Purpose:

- suitable for City construction
- high territorial value
- useful as the endpoint of a Supply Chain

Base resource generation:

None.

## 8.6 FIXED TERRAIN DISTRIBUTION

Every radius-4 board has exactly 61 hexes and exactly:

| Terrain | Count |
|---|---:|
| Plains | 25 |
| Forest | 11 |
| Mine | 11 |
| Energy Field | 9 |
| City Site | 5 |

The four predefined starting coordinates are Plains and are included in the
25-Plains total. Only spatial placement varies by deterministic seed.

---

# 9. RESOURCES

There are exactly three resources.

## Wood

Used primarily for:

- Factory construction
- City construction

## Metal

Used primarily for:

- Factory construction
- Fortress construction
- Attacks
- Fortification

## Energy

Used primarily for:

- City construction
- Fortress construction
- Attacks
- Fortification

There is no player-to-player resource trading in version 1.

### Design reason

Removing trading keeps the game's strategic focus on:

- territory,
- production,
- logistics,
- and tactical decisions.

It also differentiates the game from trading-centric board games.

---

# 10. STARTING RESOURCES

Each player begins with:

Wood = 6
Metal = 4
Energy = 4

These values are configuration parameters.

They must be tunable through the central balance configuration.

---

# 11. RESOURCE GENERATION

Resource generation occurs at the beginning of every round.

For every controlled resource hex:

Forest:

+1 Wood

Mine:

+1 Metal

Energy Field:

+1 Energy

---

# 12. RESOURCE PRODUCTION FROM FACTORIES

A Factory can increase production.

For a resource-producing hex:

Base production:

+1 resource

Factory bonus:

+1 resource

Therefore:

Mine:

+1 Metal

Mine + Factory:

+2 Metal

For a Factory on Plains:

+1 Energy per round.

---

# 13. PLAYER STATE

Every player has:

- player ID
- player name
- player color
- controlled territories
- resources
- Dominion Points
- Action Points
- buildings
- Supply Chains
- statistics
- connection status

---

# 14. PLAYER COLORS

Use visually distinct colors for the four player slots.

Recommended palette:

Player 1:
Cyan

Player 2:
Orange

Player 3:
Violet

Player 4:
Lime

Player identity must never depend only on color.

Also display:

- player name,
- icon,
- territory border,
- score.

---

# 15. ACTION POINT SYSTEM

Each player receives:

2 Action Points per turn.

Unused Action Points do not carry over.

Each normal action costs:

1 Action Point.

Available actions:

1. Claim
2. Build
3. Attack
4. Fortify
5. End Turn

Examples:

Claim + Claim

Claim + Build

Build + Fortify

Attack + Fortify

Build + Build

Attack + Claim

---

# 16. CLAIM ACTION

Cost:

1 Action Point.

Requirements:

- target hex is neutral,
- target hex is adjacent to at least one player-controlled hex,
- target hex is not occupied by another player.

Result:

The player gains ownership of the target hex.

Dominion reward:

Normal territory:
+1 Dominion

City Site:
+2 Dominion

Starting territory does not award Dominion.

---

# 17. BUILDING SYSTEM

There are exactly three buildable structures.

1. Factory
2. Fortress
3. City

Every hex has one building slot. A hex may contain at most one building:
Factory, Fortress, City, or the permanent Command Hub. Build validation rejects
any build request when that slot is occupied.

Version 1 must not contain additional building types.

---

# 18. FACTORY

## Cost

3 Wood
2 Metal
1 Energy

## Action

1 Action Point.

## Placement

Can be constructed on:

- Plains
- Forest
- Mine
- Energy Field

Only one Factory per hex.

Factories cannot be built on an occupied building slot, including a Command Hub.

## Effect

Resource-producing hex:

+1 corresponding resource per round.

Plains:

+1 Energy per round.

This is local production only. A Plains Factory is never a Supply Chain source.

---

# 19. FORTRESS

## Cost

2 Metal
1 Energy

## Action

1 Action Point.

## Placement

Can be constructed on any owned hex.

Only one Fortress per hex.

Fortresses cannot be built on an occupied building slot, including a Command Hub.

## Effect

Adds:

+3 Defense Strength.

Fortresses do not generate resources.

---

# 20. CITY

## Cost

4 Wood
4 Metal
2 Energy

## Action

1 Action Point.

## Placement

Can only be constructed on:

- Plains
- City Site

Maximum:

2 Cities per player.

Cities cannot be built on an occupied building slot, including a Command Hub.

## Effect

+3 Dominion Points immediately.

A City can serve as a Supply Chain endpoint.

---

# 21. COMMAND HUB

Each player begins with exactly one Command Hub.

The Command Hub:

- occupies the player's starting hex,
- is the permanent building occupying that hex's building slot,
- cannot be voluntarily removed,
- cannot be captured,
- cannot contain a Factory, Fortress, or City,
- cannot be fortified,
- identifies the player's home territory.

The Command Hub provides:

- strategic starting position,
- visual home marker.

The Command Hub does not directly generate resources.

---

# 22. SUPPLY CHAIN SYSTEM

Supply Chains are the primary unique strategic mechanic.

The goal is to create an infrastructure network connecting resource production to a City.

A Supply Chain represents controlled logistical connectivity.

---

# 23. VALID SUPPLY CHAIN

A Supply Chain requires:

1. An owned natural resource source: Forest, Mine, or Energy Field.
2. A Factory on that same source hex.
3. An owned City.
4. A continuous path of player-owned adjacent hexes connecting the source to the City.

Only edge-adjacent hexes count as connected.

All cells in the chain must belong to the same player.

Example:

RESOURCE + FACTORY
→ OWNED HEX
→ OWNED HEX
→ CITY

This is a valid Supply Chain.

In the valid example, Factory is part of the source label: `RESOURCE + FACTORY`.
A Factory elsewhere on the path does not activate the source.

---

# 24. SUPPLY CHAIN BONUS

Every active Supply Chain provides:

+2 additional units of the source resource per round.

Example:

Mine:

+1 Metal

Mine + Factory:

+2 Metal

Mine + Factory + active Supply Chain:

+4 Metal

This is intentional because the Supply Chain rewards:

- territorial connectivity,
- infrastructure,
- and strategic planning.

---

# 25. SUPPLY CHAIN BREAKAGE

If an opponent captures a hex that was part of a displayed Supply Chain path:

The game immediately recomputes connectivity. The chain becomes inactive only
if no valid owned path remains; it remains active if another valid owned path
still connects the selected source and City.

The player retains the structures that remain on owned territory, but the Supply Chain bonus disappears.

If the player later reconnects the chain:

The chain becomes active again.

The chain does not receive another Dominion reward for being restored.

---

# 26. SUPPLY CHAIN DOMINION REWARD

When a new unique Supply Chain is completed:

First completed unique Supply Chain:

+4 Dominion.

Every additional unique Supply Chain:

+2 Dominion.

A source hex supports at most one active Supply Chain. For one source, consider
all reachable owned Cities and select the City at minimum graph distance. Ties
are resolved by lexicographically smallest `(q, r)`. The selected source-to-City
pair is the only active chain for that source.

Completed-chain reward history is keyed by `(playerId, sourceHex)`. Restoring a
chain for that same player and source awards no new Dominion; another player who
later develops that source has a distinct history entry.

A chain restored after being broken is not considered a new chain.

---

# 27. WHY SUPPLY CHAINS?

This is a central design decision.

Without Supply Chains, players are mainly rewarded for:

- owning more territory,
- collecting more resources.

Supply Chains create a second strategic layer:

> The location and connectivity of territory become as important as the quantity of territory.

This means an opponent can attack a strategically important connecting hex rather than simply attacking the largest territory.

This produces:

- offensive targets,
- defensive priorities,
- strategic chokepoints,
- meaningful territorial positioning.

---

# 28. ATTACK SYSTEM

Combat is deterministic.

No dice are used.

## Cost

1 Action Point

3 Metal

2 Energy

## Requirements

- target belongs to another player,
- target is adjacent to at least one attacker's hex,
- target is not a Command Hub.

---

# 29. ATTACK STRENGTH

Base Attack Strength:

4

Additional support:

+1 when attacking player has 2 or more directly adjacent friendly hexes supporting the attack.

Supply Chain bonus:

+1 if the attacker has at least one active Supply Chain.

Maximum Attack Strength:

6.

All factors must be visible in the attack preview.

---

# 30. DEFENSE STRENGTH

Base Defense Strength:

3.

Fortress:

+3.

City:

+2.

Fortification:

+1 per fortification level.

Maximum fortification level:

3.

Defense must be calculated deterministically.

---

# 31. ATTACK RESOLUTION

If:

Attack Strength >= Defense Strength

the attack succeeds.

Otherwise:

the attack fails.

---

# 32. SUCCESSFUL ATTACK

When successful:

- target ownership changes,
- buildings on target are destroyed,
- target fortification is removed,
- target becomes controlled by the attacker,
- Dominion reward is granted.

Dominion rewards:

Normal hex:

+1 Dominion

City Site:

+2 Dominion

Enemy City hex:

+3 Dominion total, regardless of underlying terrain. This does not stack with
the City Site reward.

The exact values remain configurable.

---

# 33. FAILED ATTACK

When an attack fails:

- Action Point is consumed,
- attack resources are consumed,
- territory does not change.

The result must clearly explain:

Attack Strength:
X

Defense Strength:
Y

Result:
FAILED

---

# 34. FORTIFY ACTION

## Cost

1 Action Point

2 Metal

1 Energy

## Requirements

- target must be owned by the player,
- target must not be a Command Hub,
- target fortification level must be below 3.

## Effect

Increase defense by:

+1.

Maximum:

3 fortification levels.

---

# 35. TURN STRUCTURE

Every turn:

1. Current player receives 2 Action Points.
2. Turn timer starts at 30 seconds.
3. Player performs valid actions.
4. Server validates every action.
5. State changes are broadcast.
6. Player may end the turn early.
7. Turn automatically ends when the timer reaches zero.
8. Next player begins their turn.

---

# 36. ROUND STRUCTURE

At the beginning of every round:

1. Confirm Supply Chain state from the current board.
2. Generate terrain, Factory, and active Supply Chain resources.
3. Starting-player rotation occurs.
4. Player turns begin.

Supply Chains are also recalculated immediately after every Claim, Build, and
Attack. Their resource bonuses are never paid mid-turn; they apply during the
next resource-generation phase.

Every state-changing action resolves in this exact order:

`validate → spend resources → spend Action Point → apply action → recalculate
affected Supply Chains → award newly earned Dominion → check victory threshold
(flags the match; see §38) → create event metadata → broadcast full authoritative state`.

The starting player rotates every round.

Example:

Round 1:

P1 → P2 → P3 → P4

Round 2:

P2 → P3 → P4 → P1

This reduces first-player advantage.

---

# 37. WHY ROTATE FIRST PLAYER?

The first player receives the first decision opportunity in every round.

If the same player always moves first, this may create systematic first-player advantage.

Rotating turn order distributes this advantage across the players.

The project must later measure first-player advantage experimentally.

---

# 38. VICTORY CONDITIONS

There are two victory conditions.

## Threshold Victory (decided at round end)

When any player's Dominion Points >= the configured victory threshold, the match
is flagged as being in its final round. It does NOT end immediately. The round is
played to completion so that every player has taken the same number of turns,
and the match then ends at the end of that round.

The winner is the player with the highest Dominion Points at that moment
(ties use the tie-breakers in §39). The HUD shows a "FINAL ROUND" indicator once
the threshold has been reached.

Default threshold:

40 Dominion Points.

Rationale: if the match ended the instant a threshold was reached, whoever moved
first in the deciding round would have a systematic advantage. Simulation
(600+ mirror matches per player count) measured seat win rates of 59/41 (2p) and
28/33/17/21 (4p) under immediate victory; round-end victory removed the skew.

Configurable via `VICTORY_AT_ROUND_END` (default `true`). Setting it to `false`
restores immediate victory.

## Round-Limit Victory

If no player reaches the threshold:

The game ends after Round 18.

The player with the highest Dominion Points wins.

---

# 39. TIE-BREAKERS

If Dominion Points are equal:

1. Most controlled territories.
2. Most Cities.
3. Highest total remaining resources.

If all three are equal:

The result is a draw.

---

# 40. WHY HAVE A ROUND LIMIT?

Without a round limit, defensive play may cause matches to continue indefinitely.

A fixed maximum round count guarantees:

- predictable game duration,
- reasonable demonstration time,
- measurable experiments,
- controlled simulations.

The round limit is configurable.

---

# 41. WHY USE A TURN TIMER?

A 25-second timer ensures:

- decisions remain meaningful,
- players cannot stall indefinitely,
- match duration remains predictable.

The value is a tunable balance parameter.

During testing, evaluate alternative values:

15 sec
20 sec
30 sec
30 sec

Use playtesting and simulation to determine whether the default should remain 30 seconds.

---

# 42. MULTIPLAYER ARCHITECTURE

The game must use a server-authoritative architecture.

The client must NEVER directly modify authoritative game state.

The client sends action requests such as:

CLAIM(q, r)

BUILD(q, r, FACTORY)

ATTACK(targetQ, targetR)

FORTIFY(q, r)

The server validates the action.

After every accepted action, the server broadcasts the complete authoritative
state plus event metadata for targeted client animations. Clients replace their
read-only state mirror; they do not apply state deltas.

---

# 43. SERVER VALIDATION

For every action the server checks:

- player identity,
- current turn,
- available Action Points,
- resource availability,
- target validity,
- adjacency,
- ownership,
- building restrictions,
- combat conditions.

Only valid actions are committed.

---

# 44. WHY SERVER AUTHORITY?

If the client were authoritative, a malicious player could attempt to modify:

- resources,
- territory,
- Dominion Points,
- attack results,
- turn order.

Server authority creates a single trusted source of game state.

This also simplifies synchronization between players.

---

# 45. MULTIPLAYER ROOM SYSTEM

Players must be able to:

1. Create a private room.
2. Receive a room code.
3. Share the room code.
4. Join from another browser.
5. See connected players.
6. Start when at least 2 players are present.

Maximum:

4 players.

No account system is required for version 1.

No public matchmaking is required.

---

# 46. RECONNECTION

If a player disconnects:

- their game state remains on the server,
- their current turn continues,
- their timer continues,
- they can reconnect using `roomCode + playerId + reconnectToken`,
- the complete authoritative state is sent to them after reconnection.

The server must never reset the player's territory or resources merely because of a temporary disconnection. The server generates the reconnect token when the
player creates or joins the room; the client stores it in `sessionStorage`. A room
code alone must never identify a player state. A disconnected player's turn
auto-ends with no actions when its timer expires; no AI takes over.

---

# 47. AI OPPONENT

NEXUS: DOMINION must include a lightweight strategic AI.

The AI is intentionally NOT an LLM-driven game player.

The AI uses an explainable heuristic.

---

# 48. AI DECISION PROCESS

At the beginning of the AI's turn:

1. Generate all legal actions.
2. Evaluate each action.
3. Assign a heuristic score.
4. Select the highest-scoring action.
5. Apply the action.
6. Recalculate the state.
7. Repeat for the second Action Point.

The AI must never perform an illegal action.

---

# 49. AI EVALUATION FEATURES

The heuristic may consider:

- immediate Dominion gain,
- territory value,
- resource gain,
- Supply Chain completion,
- Supply Chain disruption,
- defensive importance,
- enemy threat,
- action cost,
- strategic positioning.

All AI weights must be configurable.

---

# 50. AI PRIORITY ORDER

The strategic AI should approximately prioritize:

1. Reaching the victory threshold while leading (the winning move).
2. Preventing an opponent from winning.
3. Completing a high-value Supply Chain.
4. Capturing strategically valuable territory.
5. Protecting important Supply Chain links.
6. Building economically useful infrastructure.
7. Fortifying threatened territory.
8. Ordinary expansion.

The AI should not blindly follow the list.

Actual decisions must be determined by the heuristic score.

---

# 51. WHY NOT USE AN LLM AS THE GAME AI?

The core AI should not rely on an LLM.

Reasons:

- deterministic behaviour is easier to test,
- decisions can be reproduced,
- performance can be benchmarked,
- action legality can be guaranteed,
- the evaluation function is explainable,
- game balance can be studied systematically.

An LLM may be used for optional natural-language explanation in future versions, but it must not control the authoritative game state or determine the legality of an action.

---

# 52. EXPLAINABLE AI

After an AI action, the player can click:

"WHY THIS MOVE?"

The game displays the actual heuristic evaluation.

Example:

AI captured Mine #27.

Evaluation:

Territory value: +3
Metal production: +2
Supply Chain potential: +5
Strategic position: +3
Resource cost: -1

Total:

12

The explanation must correspond to the actual calculations performed by the AI.

Do not generate fake explanations.

Do not use an LLM to invent reasoning that differs from the real AI calculation.

---

# 53. AI BENCHMARKING

The project must provide a benchmark mode.

Compare at least:

## Random AI

Chooses a random legal action.

## Greedy AI

Chooses the action with the highest immediate Dominion/resource gain.

## Strategic AI

Uses the full heuristic described above.

Run repeated matches with deterministic seeds.

Recommended:

At least 500 games per comparison after the basic game is stable.

---

# 54. AI METRICS

Record:

- win rate,
- average Dominion Points,
- average territory controlled,
- Supply Chains completed,
- successful attacks,
- average decision time,
- average game duration.

The goal is not to prove that Strategic AI is universally optimal.

The goal is to determine:

> how its performance compares with simpler baseline strategies under the defined game environment.

---

# 55. GAME BALANCE EXPERIMENTS

Balance must be evaluated experimentally.

Important parameters:

- initial resources,
- resource production,
- building costs,
- attack costs,
- defense values,
- Dominion rewards,
- victory threshold,
- round limit,
- turn duration,
- Supply Chain bonuses.

Run simulated games with different parameter configurations.

Measure:

- first-player advantage,
- average match duration,
- win-rate distribution,
- average territory distribution,
- resource accumulation,
- Supply Chain frequency.

Do not claim a parameter is "optimal" without experimental evidence.

---

# 56. FIRST-PLAYER ADVANTAGE TEST

Run a large number of games.

Record which starting position wins.

Example report:

Position 1 win rate:
XX%

Position 2:
XX%

Position 3:
XX%

Position 4:
XX%

If one starting position has a significant advantage, modify:

- starting resources,
- board layout,
- player turn rotation,
- or starting position.

Run the experiment again.

---

# 57. RANDOMIZED BOARD EXPERIMENT

Board terrain placement may vary between generated maps, but the fixed terrain
counts in §8.6 must always be preserved and every generated map must pass the
fairness test in §6.3. Each generated map must have a deterministic seed.

This allows results to be reproduced.

---

# 58. DEMO MODE

The project must contain a configurable Demo Mode.

Normal:

MAX_ROUNDS = 18
TURN_DURATION = 30 seconds
VICTORY_SCORE = 40

Demo:

MAX_ROUNDS = 8
TURN_DURATION = 15 seconds
VICTORY_SCORE = 20

Demo Mode exists only to demonstrate the project quickly.

It must use the exact same game engine and rules.

Only configuration parameters change.

---

# 59. USER INTERFACE

The game must have a polished futuristic interface.

## Main Menu

Display:

NEXUS: DOMINION

Buttons:

- Create Room
- Join Room
- How to Play

---

# 60. LOBBY

Display:

Room Code

Connected Players

Player Color

Ready/Connected status

Start Game button

Example:

ROOM: X7K92

Player 1    Connected
Player 2    Connected
Player 3    Waiting
Player 4    Waiting

START GAME

---

# 61. MAIN GAME HUD

Top section:

- Round
- Turn
- Turn timer

Player information:

- Dominion Points
- Wood
- Metal
- Energy
- Action Points

Action bar:

- Claim
- Build
- Attack
- Fortify
- End Turn

Event log:

- recent actions
- captures
- constructions
- attacks
- Supply Chain activations
- victory events

---

# 62. BUILD MENU

When a player selects an owned hex, show valid actions.

Example:

BUILD FACTORY

Cost:
3 Wood
2 Metal
1 Energy

Action:
1 AP

Effect:
+1 resource production

If unavailable:

Insufficient Metal

or:

Factory already exists

or:

Hex cannot contain this structure

The interface must clearly distinguish:

- available actions,
- unavailable actions,
- action costs.

---

# 63. ATTACK PREVIEW

Before confirming an attack, display:

Attacker:

Attack Strength = X

Defender:

Defense Strength = Y

Costs:

3 Metal
2 Energy
1 AP

Result:

SUCCESS
or
FAILURE

This makes combat transparent.

---

# 64. SUPPLY CHAIN VISUALIZATION

Active Supply Chains must be visually highlighted.

For example:

Resource Hex
→ glowing connection
→ Factory
→ glowing connection
→ City

When a chain breaks:

- connection effect disappears,
- bonus is removed,
- event log displays the break.

This is one of the visually important features of the game.

---

# 65. MAP VISUAL DESIGN

The board must NOT look like a classroom prototype.

The target visual style is:

## Futuristic tactical command map

Use:

- dark environment,
- glowing hex borders,
- rich terrain artwork,
- neon accents,
- subtle particle effects,
- soft shadows,
- depth,
- polished typography,
- animated territory ownership,
- futuristic HUD elements.

Avoid:

- medieval board-game styling,
- wooden textures,
- paper board appearance,
- fantasy Catan-like art,
- realistic 3D production requiring large asset pipelines.

---

# 66. TERRAIN VISUAL DESIGN

## Forest

Visual:

- futuristic vegetation,
- glowing flora,
- subtle particles.

## Mine

Visual:

- dark rocky terrain,
- glowing metal veins,
- industrial lights.

## Energy Field

Visual:

- luminous energy core,
- electrical particles.

## Plains

Visual:

- clean open terrain,
- subtle futuristic surface.

## City Site

Visual:

- futuristic structures,
- urban glow,
- high strategic visual emphasis.

---

# 67. TERRITORY VISUALIZATION

Each player's territory must have:

- glowing border,
- subtle ownership tint,
- player icon,
- optional territory pulse when selected.

When territory changes ownership:

1. Old border fades.
2. New border appears.
3. Tile flashes.
4. Particle effect occurs.
5. Dominion counter animates.

---

# 68. BUILDING ANIMATIONS

Factory:

- holographic construction outline,
- short construction animation,
- final structure materialization.

Fortress:

- defensive structure animation,
- shield/energy effect.

City:

- larger construction effect,
- stronger visual emphasis.

---

# 69. ATTACK ANIMATION

Successful attack:

1. Target highlights.
2. Attack effect travels.
3. Impact occurs.
4. Defense value decreases.
5. Territory border changes.
6. Dominion counter updates.

Failed attack:

1. Attack effect occurs.
2. Shield/defense effect appears.
3. Target remains unchanged.
4. UI displays failure reason.

---

# 70. RESOURCE ANIMATION

At round start:

- resource icons animate,
- numbers increment smoothly,
- small floating resource indicators appear.

Example:

+2 Metal

+1 Energy

---

# 71. VICTORY SCREEN

Display:

NEXUS: DOMINION

WINNER

Player Name

Final Dominion Score

Statistics:

- Territories
- Cities
- Supply Chains
- Successful Attacks
- Resources Collected
- Resources Spent

Buttons:

- Play Again
- Return to Lobby

The victory presentation should be visually impressive.

---

# 72. AUDIO

Provide subtle sound feedback for:

- button click,
- tile selection,
- resource generation,
- building,
- attack,
- territory capture,
- turn transition,
- victory.

Include:

Mute button.

Audio must remain secondary to gameplay.

---

# 73. TECHNICAL STACK

Preferred stack:

Frontend:

React + Vite

Game rendering:

Phaser 3

Language:

JavaScript

Backend:

Node.js

Networking:

Socket.IO multiplayer

Storage:

SQLite

Deployment:

A browser-accessible hosting environment.

An existing multiplayer game scaffold such as Homie may be used if it reduces infrastructure work.

If an existing scaffold is used:

- do not duplicate its networking implementation unnecessarily,
- keep game rules independent from scaffold-specific implementation,
- preserve server-authoritative game logic.

---

# 74. WHY PHASER?

The game is:

- 2D,
- browser-based,
- grid/board-oriented,
- animation-heavy,
- relatively small in world complexity.

Phaser provides:

- WebGL rendering,
- sprite support,
- animation,
- particles,
- camera handling,
- input handling,
- scene management.

A larger 3D engine would introduce unnecessary complexity for version 1.

---

# 75. CODE ARCHITECTURE

Separate:

1. Game logic
2. Multiplayer/server logic
3. Rendering
4. UI
5. Simulation
6. Benchmarking

Recommended structure:

client/
  game/
    Board.js
    Hex.js
    GameScene.js
    TerrainRenderer.js
    TerritoryRenderer.js
    BuildingRenderer.js
    Effects.js

  ui/
    MainMenu.jsx
    Lobby.jsx
    HUD.jsx
    BuildMenu.jsx
    AttackPreview.jsx
    EventLog.jsx
    AIExplanation.jsx
    VictoryScreen.jsx
    StatisticsScreen.jsx

  assets/

server/
  GameState.js
  TurnManager.js
  Rules.js
  Actions.js
  Combat.js
  Resources.js
  SupplyChains.js
  Victory.js
  AI.js
  RoomManager.js
  Validation.js

shared/
  constants.js
  gameConfig.js
  hexMath.js
  validation.js

simulation/
  Simulator.js
  RandomAI.js
  GreedyAI.js
  StrategicAI.js
  Benchmark.js
  Metrics.js
  BalanceExperiment.js

tests/
  hex/
  rules/
  combat/
  resources/
  supply/
  victory/
  multiplayer/
  ai/

---

# 76. AUTHORITATIVE GAME STATE

The server's GameState must contain:

- board seed,
- board terrain,
- hex ownership,
- building state,
- fortification level,
- player resources,
- Dominion Points,
- Action Points,
- current player,
- round number,
- turn timer,
- active Supply Chains,
- completed Supply Chains,
- match status,
- winner,
- statistics.

GameState must be serializable.

## 76.1 AUTHORITATIVE JSON WIRE FORMAT

Do not serialize JavaScript `Map` objects directly. Every full-state Socket.IO
payload uses one canonical JSON GameState format. Its `board` field is an array
of cell objects, each containing at minimum:

```json
{ "q": 0, "r": 0, "terrain": "plains", "ownerId": null,
  "building": null, "fortificationLevel": 0 }
```

The complete payload has these top-level fields:

```text
matchId, initialSeed, boardSeed, status, currentRound, currentPlayerIndex,
turnTimeRemaining, startingPlayerOffset, players, board, activeSupplyChains,
completedChainRecords, winnerId, eventLog
```

`players`, `activeSupplyChains`, `completedChainRecords`, and `eventLog` are
arrays; `board` is the cell array above. A completed-chain record contains at
least `playerId`, `sourceKey`, and `dominionAwarded`. `building` is one of
`null`, `factory`, `fortress`, `city`, or `command_hub`.

## 76.2 RESPONSIBILITY BOUNDARIES

- `shared`: pure deterministic rules and algorithms.
- `server`: authoritative orchestration, rooms, timers, persistence, and Socket.IO.
- `client`: rendering, input, UI, and a read-only server-state mirror.
- `simulation`: headless execution using the same shared rules and GameEngine.

Core game rules must not be duplicated between these layers.

---

# 77. HEX IMPLEMENTATION

Create reusable functions:

getNeighbors(q, r)

isValidHex(q, r)

distanceBetweenHexes(a, b)

findConnectedTerritory(player)

findSupplyChain(source, city)

findReachableTerritories(player)

The hex implementation should be independent from Phaser rendering.

---

# 78. SUPPLY CHAIN ALGORITHM

Use deterministic BFS graph traversal on the player's territory.

A Supply Chain exists if:

1. source is Forest, Mine, or Energy Field and has a Factory on that same hex,
2. source has a Factory,
3. player owns the source,
4. destination is an owned City,
5. a path of owned adjacent hexes exists.

Use BFS with a fixed axial neighbor order. It must find minimum graph-distance
Cities, use lexicographic `(q, r)` tie-breaking, and return the selected path
for visualization.

The algorithm must return:

- whether the chain exists,
- path cells,
- source,
- destination,
- resource type.

The rendering layer can then visualize the returned path.

---

# 79. WHY BFS/DFS FOR SUPPLY CHAINS?

Supply Chain detection only requires determining whether two owned hexes are connected.

Each hex is a node.

Each adjacent hex is an edge.

Therefore the problem is a graph connectivity problem.

BFS is sufficient and required because it establishes connectivity while also
yielding minimum graph-distance candidates deterministically.

Shortest path is NOT required for basic chain validation.

If later versions require optimization of logistics distance, shortest-path algorithms may be added.

---

# 80. SERVER-SIDE COMBAT

Combat calculation must be a pure function.

Example:

calculateAttackStrength(state, attacker, target)

calculateDefenseStrength(state, defender, target)

resolveAttack(attackStrength, defenseStrength)

Given the same input state, these functions must always return the same result.

---

# 81. TESTING REQUIREMENTS

Unit tests must cover:

Hex:

- neighbor calculation,
- coordinate validity,
- distance.

Territory:

- valid claim,
- invalid claim,
- disconnected claim.

Resources:

- generation,
- building bonuses,
- resource costs.

Buildings:

- valid placement,
- invalid placement,
- maximum limits.

Combat:

- successful attack,
- failed attack,
- fortress defense,
- city defense,
- fortification.

Supply Chains:

- valid chain,
- broken chain,
- restored chain,
- multiple chains.

Turns:

- Action Point reset,
- turn rotation,
- timer timeout.

Victory:

- immediate victory,
- round-limit victory,
- tie-breakers.

Multiplayer:

- invalid turn request,
- unauthorized action,
- invalid resource modification,
- reconnect.

AI:

- no illegal actions,
- deterministic output,
- valid explanation.

---

# 82. SECURITY REQUIREMENTS

Never trust client-provided:

- resources,
- ownership,
- Dominion Points,
- attack results,
- building state,
- turn state.

All authoritative calculations must be performed on the server.

---

# 83. SIMULATION ENGINE

Create a standalone simulator independent from the browser UI.

It must be able to:

1. Generate a board from a seed.
2. Create players.
3. Execute turns automatically.
4. Apply game rules.
5. Record game state.
6. Finish a complete match.
7. Export metrics.

This makes balance testing and AI benchmarking reproducible.

---

# 84. BENCHMARK REPRODUCIBILITY

Every simulation must support:

- deterministic random seed,
- fixed game configuration,
- recorded AI type,
- recorded starting positions.

A benchmark result must be reproducible by rerunning the same configuration.

---

# 85. PERFORMANCE METRICS

The benchmark system must record:

- average response/decision time of AI,
- game duration,
- Dominion score,
- territory count,
- Supply Chain count,
- resource efficiency,
- successful attacks,
- failed attacks.

The UI should provide charts for benchmark results.

---

# 86. DEMO SCENARIOS

Prepare controlled demo scenarios.

## Demo 1 — Territory Expansion

Show:

Neutral hex
→ Claim
→ Territory changes ownership.

## Demo 2 — Resource Generation

Show:

Mine
→ Resource generation
→ Factory
→ increased Metal production.

## Demo 3 — Supply Chain

Show:

Mine
→ Factory
→ connected territory
→ City

Supply Chain activates.

## Demo 4 — Supply Chain Disruption

Opponent captures middle hex.

Supply Chain disappears.

## Demo 5 — Attack

Show:

Attack Strength
vs
Defense Strength

Perform deterministic attack.

## Demo 6 — AI

AI takes a turn.

Click:

WHY THIS MOVE?

Show actual heuristic calculation.

## Demo 7 — Multiplayer

Open two browser windows.

Two human players make actions.

Both clients see the same state.

---

# 87. OPTIONAL DEVELOPMENT TOOLS

Claude Code or another coding agent may be used to implement:

- scaffolding,
- components,
- backend,
- multiplayer code,
- rendering,
- tests,
- debugging,
- deployment scripts,
- asset integration.

However, generated code must remain understandable.

Do not introduce libraries merely because they are available.

Every dependency must have a purpose.

---

# 88. DEVELOPMENT RULE FOR CLAUDE CODE

Claude Code must NOT invent gameplay mechanics.

The specification is authoritative.

When requirements are ambiguous:

1. identify the ambiguity,
2. propose the smallest reasonable interpretation,
3. do not add additional mechanics without approval.

Do not introduce:

- additional resources,
- random events,
- cards,
- trading,
- units,
- diplomacy,
- character systems,
- progression systems,
- monetization,
- unnecessary AI frameworks.

---

# 89. IMPLEMENTATION ORDER

The project must be implemented in phases.

## Phase 1 — Core Engine

Implement:

- hex board,
- terrain,
- player state,
- turns,
- resources,
- claiming.

Use simple placeholder graphics.

Goal:

A complete basic single-player game loop.

---

## Phase 2 — Infrastructure

Implement:

- Factory,
- Fortress,
- City,
- resource generation,
- fortification.

Goal:

Economic gameplay works.

---

## Phase 3 — Supply Chains

Implement:

- connectivity,
- Supply Chain creation,
- Supply Chain bonuses,
- Supply Chain breakage,
- Supply Chain restoration.

Goal:

The unique strategy mechanic works.

---

## Phase 4 — Combat

Implement:

- attack validation,
- attack strength,
- defense strength,
- deterministic resolution,
- ownership transfer.

Goal:

Territorial conflict works.

---

## Phase 5 — Multiplayer

Implement:

- room creation,
- room joining,
- server-authoritative state,
- synchronization,
- turn management,
- reconnect.

Goal:

2–4 humans can play a complete match.

---

## Phase 6 — AI

Implement:

- Random AI,
- Greedy AI,
- Strategic AI,
- AI explanation.

Goal:

AI can play complete matches and be benchmarked.

---

## Phase 7 — Simulation

Implement:

- automated game simulation,
- deterministic seeds,
- balance experiments,
- benchmark reports.

Goal:

Quantitative evaluation becomes possible.

---

## Phase 8 — Visual Polish

Only after the game is mechanically stable:

- custom terrain artwork,
- territory effects,
- particles,
- building animations,
- transitions,
- UI polish,
- sound,
- victory presentation.

---

## Phase 9 — Testing and Deployment

Perform:

- full regression testing,
- multiplayer testing,
- balance testing,
- browser testing,
- deployment testing.

No new gameplay mechanics should be added in the final phase.

---

# 90. VISUAL PRIORITY

Visual quality is a major requirement.

Because the mechanical scope is intentionally small, development effort should be disproportionately invested in presentation.

Prioritize:

1. Board appearance
2. Terrain art
3. Territory effects
4. Selection effects
5. Capture animations
6. Building animations
7. Supply Chain visualization
8. HUD
9. Victory screen
10. Audio

The objective is:

"small game, premium presentation."

---

# 91. NON-GOALS

Version 1 must NOT include:

- mobile application,
- native desktop application,
- public matchmaking,
- user accounts,
- voice chat,
- text chat,
- monetization,
- advertisements,
- player ranking systems,
- advanced reinforcement learning,
- LLM-controlled game state,
- complex 3D graphics,
- dozens of unit types,
- dozens of resources,
- large open-world maps.

---

# 92. REAL TECHNICAL CONTRIBUTIONS

The project should be presented as a combination of:

## Contribution 1

Hex-based strategic territory engine.

## Contribution 2

Supply Chain connectivity and disruption system.

## Contribution 3

Server-authoritative multiplayer game architecture.

## Contribution 4

Explainable heuristic AI.

## Contribution 5

Simulation-based game balance and AI evaluation.

The project is NOT presented merely as:

"We built a multiplayer game."

It is presented as:

> "We designed a multiplayer territorial strategy system and evaluated its strategic mechanics and AI using reproducible simulation."

---

# 93. VIVA DESIGN-DECISION RECORD

Every major design decision must have a documented reason.

For each important feature, maintain:

Decision:
Reason:
Alternative:
Tradeoff:
Experimental validation:

Examples:

Hex grid:
- Reason: uniform six-neighbor adjacency.
- Alternative: square grid.
- Tradeoff: slightly more complex coordinates.
- Validation: verify movement/territory operations and gameplay balance.

Turn-based:
- Reason: strategic decision-making and deterministic synchronization.
- Alternative: real-time.
- Tradeoff: less continuous gameplay.
- Validation: playtesting and match duration.

Three resources:
- Reason: enough economic diversity without overwhelming players.
- Alternative: more resources.
- Tradeoff: lower economic complexity.
- Validation: playtesting and resource-utilization statistics.

No dice:
- Reason: deterministic and reproducible combat.
- Alternative: probabilistic combat.
- Tradeoff: less randomness.
- Validation: strategic decision quality and benchmark reproducibility.

Server authority:
- Reason: consistent state and cheat resistance.
- Alternative: client-authoritative.
- Tradeoff: more backend responsibility.
- Validation: invalid-action tests.

---

# 94. VIVA QUESTION PREPARATION

The implementation must make the following questions answerable:

Why did we choose a hexagonal grid?

Why is the game turn-based?

Why do we use server-authoritative multiplayer?

Why are there only three resources?

Why is combat deterministic?

How is Supply Chain detection implemented?

Why is BFS/DFS sufficient for Supply Chain detection?

Why does a Factory increase production?

Why do Supply Chains matter strategically?

How is attack strength calculated?

How is defense calculated?

How did we choose game-balance parameters?

How did we test first-player advantage?

How does the AI choose a move?

Why use a heuristic instead of an LLM?

How do we know that the AI is better than a baseline?

How do we make benchmark results reproducible?

What happens when a player disconnects?

How do we prevent cheating?

Why did we choose Phaser?

Why is the server the source of truth?

What are the project's current limitations?

---

# 95. LIMITATIONS

The project must explicitly acknowledge:

1. Version 1 is a prototype and not a commercial-scale multiplayer game platform.
2. Balance is based on controlled simulations and playtesting.
3. AI is heuristic-based rather than optimal.
4. The game does not attempt to solve general game-playing.
5. Multiplayer scale is intentionally limited to 2–4 players.
6. The game is browser-based and optimized for desktop/laptop demonstrations.
7. The game uses deterministic rules rather than modeling every possible real-world strategic uncertainty.

---

# 96. SUCCESS CRITERIA

The project is considered successful when:

### Gameplay

- 2–4 players can complete a match.
- All rules function correctly.
- A match normally finishes within the target duration.
- Players understand the core mechanics.

### Multiplayer

- Players can create and join rooms.
- Game state remains synchronized.
- Invalid actions are rejected.
- Reconnection works.

### Strategy

- Territory has meaningful value.
- Supply Chains affect decisions.
- Combat creates strategic interaction.
- Defensive play and expansion both have value.

### AI

- Random AI works.
- Greedy AI works.
- Strategic AI works.
- AI never performs invalid actions.
- AI explanations correspond to actual calculations.

### Evaluation

- Automated simulation works.
- Benchmarking works.
- Balance experiments work.
- Results are reproducible.

### Visual

- Game has polished futuristic presentation.
- Major actions have visual feedback.
- Supply Chains are visible.
- Victory screen is polished.

---

# 97. FINAL DEMO FLOW

The preferred live demonstration is approximately 8–12 minutes.

1. Open NEXUS: DOMINION.
2. Create a room.
3. Join using a second browser.
4. Show the futuristic board.
5. Explain resources and Action Points.
6. Claim territory.
7. Build a Factory.
8. Show increased resource production.
9. Create a Supply Chain.
10. Show Supply Chain bonus.
11. Opponent attacks a connecting hex.
12. Show Supply Chain disruption.
13. Demonstrate deterministic combat.
14. Introduce an AI player.
15. Show AI decision.
16. Click "WHY THIS MOVE?"
17. Show benchmark results.
18. End on the match statistics/victory screen.

---

# 98. FINAL PROJECT DESCRIPTION

NEXUS: DOMINION is a browser-based multiplayer territorial strategy game built around a hexagonal battlefield, resource management, infrastructure development, Supply Chain connectivity, and deterministic territorial combat.

Its technical focus is on:

- hex-grid algorithms,
- graph-based connectivity,
- server-authoritative multiplayer state,
- explainable strategic AI,
- and reproducible simulation-based game evaluation.

The game intentionally keeps its mechanics compact so that the strategic interaction between territory, resources, infrastructure, connectivity, and combat remains understandable and experimentally measurable.

The final product must combine:

POLISHED GAMEPLAY
+
STRONG VISUAL DESIGN
+
MULTIPLAYER FUNCTIONALITY
+
EXPLAINABLE STRATEGY
+
MEASURABLE EXPERIMENTATION

The game should feel like a polished small indie strategy title rather than a classroom prototype.
```
