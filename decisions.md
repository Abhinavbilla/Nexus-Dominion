# NEXUS: DOMINION — Approved Decision Register

> [!IMPORTANT]
> All 12 decisions are **locked**. This document is the authoritative supplement to [spec.md](file:///D:/hex%20dominion/spec.md). Implementation must conform to every ruling below.

---

## Decision 1: Building Stacking ✅ KEEP

**Rule**: One building per hex. A hex may contain at most one of: Factory, Fortress, or City.

**Status**: Approved as proposed.

**Implementation**: `HexCell.building` is `null | "factory" | "fortress" | "city"`. Build validation rejects if `hex.building !== null`.

**Balance effect**: Forces production-vs-defense tradeoff per hex.

---

## Decision 2: Factory Location for Supply Chains ✅ KEEP

**Rule**: The Factory must be built on the resource-producing source hex for that hex to qualify as a Supply Chain origin.

**Status**: Approved as proposed.

**Implementation**: Supply Chain detection checks `hex.building === "factory"` on the candidate source hex. A Factory elsewhere on the path is irrelevant to chain validity.

**Balance effect**: Each chain requires a dedicated Factory investment on the source hex.

---

## Decision 3: Plains + Factory and Supply Chains ⚠️ CHANGED

**Rule**: A Plains hex with a Factory produces +1 Energy per round locally. However, a Plains + Factory hex **cannot** be the source of a Supply Chain. Only natural resource terrain (Forest, Mine, Energy Field) qualifies as a Supply Chain source.

**Approved change**: Local Energy production is retained (per spec §12). Supply Chain eligibility is denied.

**Rationale**: Preserves the strategic scarcity of Energy Fields. If Plains could source Energy chains, Energy would be trivially abundant (Plains = 25 of 61 hexes), devaluing Energy Fields as strategic targets.

**Implementation**: Supply Chain detection adds a terrain filter: source hex must have `terrain ∈ { "forest", "mine", "energy_field" }`. The `+1 Energy` from Factory-on-Plains is applied during resource generation regardless.

**Balance effect**: Energy Fields remain critical territory. Players needing Energy chains must control and develop Energy Field hexes specifically.

---

## Decision 4: Command Hub and Building Slot ⚠️ CHANGED

**Rule**: The Command Hub **occupies the building slot** on the starting hex. No Factory, Fortress, or City may be constructed on a Command Hub hex. The Command Hub cannot be removed or replaced.

**Approved change**: Command Hub IS the building on the hex.

**Rationale**: Prevents players from trivially fortifying their uncapturable home hex or gaining early production from it. The starting hex is a strategic anchor, not an economic asset. Players must expand to gain production.

**Implementation**: `HexCell.building = "command_hub"` on each player's starting hex at game initialization. Build validation treats `"command_hub"` as an occupied slot — `if (hex.building !== null) reject()` covers it uniformly. The `"command_hub"` type is never constructible through player actions.

**Balance effect**: Starting hexes are economically inert. Players must claim and develop adjacent hexes for any production. Slightly slows early economy compared to the alternative. Command Hubs cannot be fortified; Fortify is valid only on capturable owned territories.

---

## Decision 5: Victory Check Timing ✅ KEEP

**Rule**: Victory is checked immediately after every action that awards Dominion Points. If a player reaches the victory threshold (default 30), the game ends instantly. No further actions are taken.

**Status**: Approved as proposed.

**Dominion-granting actions**:
- Claim: +1 (normal) or +2 (City Site)
- Attack capture: +2 (normal) or +3 (City Site) or +4 (enemy City hex)
- Build City: +3
- Supply Chain completion: +4 (first) or +2 (subsequent)

**Implementation**: `ActionProcessor` calls `checkVictory(playerId)` after applying any action that modifies `player.dominionPoints`. If threshold is met, `GameEngine` transitions state to `"finished"` immediately.

**Balance effect**: First-mover advantage in the final round. Mitigated by turn rotation (§37).

---

## Decision 6: Disconnected Player Turn Handling ✅ KEEP

**Rule**: When a disconnected player's turn arrives, the turn timer runs normally. When it expires, the turn ends with no actions taken. No AI substitution occurs.

**Status**: Approved as proposed.

**Implementation**: No special logic. The existing timer-expiry handler ends the turn. UI displays "Player X — Disconnected" during their turn slot.

**Balance effect**: Disconnected player's territory becomes vulnerable to opponents' attacks over successive rounds.

---

## Decision 7: Starting Territory Size ✅ KEEP (Conditional)

**Rule**: Each player starts with exactly one hex — their Command Hub hex. All other 60 hexes (57 in a 4-player game with 4 starting hexes) are neutral.

**Status**: Approved **conditionally** — must be validated through simulation.

**Validation criteria**: Run 500+ simulated games. If the opening 3 rounds are dominated by pure claiming with no meaningful strategic decisions, consider increasing starting territory to a 3-hex cluster. Measure:
- Decision entropy in rounds 1-3
- Average round at which first combat occurs
- Average round at which first building is constructed

**Implementation**: `GameState` initialization assigns ownership of one hex per player.

**Balance effect**: Maximizes early-game claiming pressure. Every expansion direction is a strategic commitment.

**Clarification**: This remains provisional and has not been empirically
validated. The simulation plan must define acceptance thresholds for the listed
metrics before claiming that one-hex starts are balanced.

---

## Decision 8: WebSocket Implementation ⚠️ CHANGED

**Rule**: Use **Socket.IO** for client-server communication instead of raw WebSocket.

**Approved change**: Socket.IO.

**Rationale**: Socket.IO provides automatic reconnection with backoff, transport fallback, built-in event-based messaging, and acknowledgment callbacks. These reduce boilerplate for a university project where networking infrastructure is not the primary technical contribution.

**Implementation**:
- Server: `socket.io` npm package. Events map 1:1 to our message types (`"action"`, `"create_room"`, etc.).
- Client: `socket.io-client` npm package.
- Room management still uses our custom `RoomManager` — Socket.IO rooms are used only for broadcast targeting, not game logic.
- Game-specific reconnection (state restoration) is implemented on top of Socket.IO's transport reconnection.

**Viva note**: Be prepared to explain why Socket.IO was chosen over raw WebSocket and what it provides beyond raw transport. Key answer: "Socket.IO handles transport-level reconnection and fallback. Our game-level reconnection (restoring full game state) is built on top of it."

**Balance effect**: None. Infrastructure decision.

---

## Decision 9: State Synchronization Strategy ⚠️ CHANGED

**Rule**: After every accepted action, the server sends the **full authoritative game state** to all clients, plus an **event metadata** object describing what changed (for animation purposes).

**Approved change**: Full state every time + event metadata.

**Message structure**:
```json
{
  "type": "ACTION_RESULT",
  "success": true,
  "gameState": { /* full authoritative GameState */ },
  "event": {
    "action": "claim",
    "playerId": "p1",
    "hex": { "q": -3, "r": 0 },
    "dominionAwarded": 1
  }
}
```

**Rationale**: With 61 hexes, full state is ~5-10KB — negligible for WebSocket. Full-state sync eliminates an entire class of desync bugs. The `event` metadata tells the client what to animate without requiring diffing.

**Implementation**:
- Server serializes `GameState` after every action and broadcasts with the event.
- Client replaces its entire local state mirror on every `ACTION_RESULT`.
- Client reads `event` to trigger animations (capture flash, build effect, attack animation, etc.).
- No client-side diffing, no delta-application logic, no checksum verification needed.
- Reconnection uses the same `STATE_SYNC` message with full state — no special reconnection serializer.

**Viva defense**: "At 61 hexes, full state is under 10KB. We prioritize correctness over micro-optimization. Full-state sync means the client is always guaranteed to match the server. The event metadata provides animation targeting without the fragility of delta-based updates."

**Balance effect**: None. Networking decision.

---

## Decision 10: Terrain Distribution ⚠️ CHANGED

**Rule**: The board uses **fixed terrain counts** (no ranges):

| Terrain | Count | Notes |
|---------|-------|-------|
| Plains | 25 | Includes 4 starting hexes |
| Forest | 11 | Wood production |
| Mine | 11 | Metal production |
| Energy Field | 9 | Energy production |
| City Site | 5 | Strategic targets |
| **Total** | **61** | |

**Approved change**: Exact fixed counts. Only spatial placement varies by seed.

**Rationale**: Fixed counts isolate spatial strategy as the only map variable. Total resource availability is identical across all games. This eliminates "unfair map" as a confounding variable in balance experiments and benchmark reproducibility.

**Implementation**:
- Board generator creates a list of 61 terrain assignments: 25 Plains, 11 Forest, 11 Mine, 9 Energy Field, 5 City Site.
- The 4 starting hexes are pre-assigned as Plains (consuming 4 of the 25 Plains budget).
- The remaining 57 terrain tokens are assigned to non-starting hexes using a seeded shuffle.
- A symmetry pass ensures each starting zone (distance ≤ 2) has comparable resource access.
- If the symmetry pass fails (rare with fixed counts), re-shuffle with a derived seed.

**Balance effect**: Macro-balance is identical across all games. Only spatial distribution affects strategy. This is the most controlled option for balance experiments.

---

## Decision 11: Supply Chain Exclusivity 🆕 ADDED

**Rule**: A natural resource source hex can have **at most one active Supply Chain**. If a source is connected to multiple owned Cities, select the City at minimum BFS graph distance; if tied, select lexicographically smallest `(q, r)`. The player cannot gain multiple chain bonuses from the same source.

**Rationale**: Without this constraint, a single Mine+Factory connected to two Cities would grant +4 Metal/round in chain bonuses (2× the +2 bonus), making multi-City connected territories disproportionately powerful. This would create a runaway advantage for players who build two Cities early.

**Implementation**:
- Supply Chain detection iterates over resource+Factory hexes.
- For each source, BFS finds all connected Cities using the canonical axial-neighbor order from `spec.md` §5.
- The minimum-distance City, then lexicographically smallest `(q, r)` tie-breaker, creates the only active chain for that source.
- Other connected Cities are ignored for that source.
- A different source hex connected to the same City is a separate chain (one chain per source).

**Uniqueness key**: `(source hex)` — each source contributes at most one chain.

**Note**: A City can still be the endpoint of multiple chains from *different* sources. This is permitted and rewarded. Completed-chain reward history is keyed by `(playerId, sourceHex)`; restoration for that same pair gives no new reward, while a later owner has a distinct history entry.

**Balance effect**: Prevents exponential scaling of resource bonuses through multi-City connectivity. Keeps Supply Chain value linear in the number of developed source hexes.

---

## Decision 12: Supply Chain Recalculation Timing 🆕 ADDED

**Rule**: Supply Chains are recalculated **immediately after every state-changing action**, not only at round start.

**State-changing actions that trigger recalculation**:
- Claim (new hex may complete or extend a path)
- Build (Factory may activate a new chain; City may become a new endpoint)
- Attack (captured hex may break an opponent's chain or complete the attacker's)
- Fortify (does NOT trigger recalculation — no ownership or building change)

**Rationale**: If chains were only recalculated at round start, a player who completes a chain mid-round would not see the visual feedback or receive the Dominion reward until the next round. An opponent who breaks a chain mid-round would still benefit from the broken chain's bonuses until the round ends. Per-action recalculation ensures the game state is always consistent and feedback is immediate.

**Implementation**:
- Every state-changing action resolves as: validate → spend resources → spend Action Point → apply action → recalculate affected Supply Chains → award newly earned Dominion → check victory → create event metadata → broadcast full authoritative state.
- After Claim, Build, or Attack applies ownership/building changes, call `recalculateSupplyChains(gameState)`.
- Compare the new chain set against the previous chain set.
- Newly completed chains: award Dominion (+4 first / +2 subsequent), mark in `completedChainRecords`.
- Newly broken chains: mark as inactive only when recomputed connectivity finds no valid owned path; an alternate valid path keeps the chain active.
- Restored chains: reactivate (no new Dominion award, per §25).
- Resource bonuses from chains are still applied only during round-start resource generation (unchanged). The recalculation updates chain *status*, not resource production mid-turn.

**Important distinction**:
- **Chain status** (active/inactive) updates immediately after actions.
- **Chain resource bonus** (+2/round) is applied only during round-start resource generation.
- **Chain Dominion reward** (+4/+2) is awarded immediately upon chain completion.

**Balance effect**: Makes Supply Chain disruption tactically immediate. An attack that breaks a chain removes the chain's status instantly, which affects:
- The attacker's Supply Chain combat bonus (+1 attack if attacker has any active chain)
- Visual feedback (chain glow disappears)
- Dominion from new chains (if an action creates a new chain path)

---

## Canonical Implementation Clarifications

The following clarifications are binding interpretations of the locked decisions.

### Combat and Command Hubs

- Capturing an enemy City awards **+4 Dominion total**, regardless of underlying
  terrain. An unbuilt City Site awards +2; these rewards never stack.
- A Command Hub is permanent, uncapturable, unremovable, occupies its building
  slot, cannot contain another building, and cannot be fortified.

### Deterministic Supply Chains

- Only Forest, Mine, and Energy Field may be sources; the Factory must occupy
  that source hex. Plains Factories provide local Energy only.
- BFS uses the fixed axial-neighbor order in `spec.md` §5. It selects the
  minimum-distance reachable City, then lexicographically smallest `(q, r)`.
- Capture triggers a connectivity recomputation. A chain is inactive only when
  no valid owned path remains.
- Completed-chain history is `(playerId, sourceHex)`. The same pair cannot earn
  a restoration reward; a new owner is a new pair.

### Board Generation and Fairness

- Use Mulberry32. Enumerate cells in lexicographic `(q, r)` order, reserve the
  four starts as Plains, shuffle the remaining 21 Plains/11 Forest/11 Mine/9
  Energy Field/5 City Site tokens, and assign in that order.
- Validate that every start has each natural resource within distance 3 and that
  the greatest difference between players' three-resource distance sums is at
  most 2. On failure use `(seed + 0x9E3779B9) >>> 0` and retry.
- Record both the initial match seed and the accepted board seed. One-hex starts
  remain provisional pending simulation and playtesting.

### State, Networking, and Layer Boundaries

- Reconnection requires `roomCode + playerId + reconnectToken`; the server
  creates the token and the client stores it in `sessionStorage`.
- Socket.IO broadcasts the complete canonical JSON GameState plus event metadata
  after every accepted action. JavaScript Maps are never sent directly.
- `board` serializes as an array of `{ q, r, terrain, ownerId, building,
  fortificationLevel }` objects. `building` includes `command_hub`.
- Shared modules contain pure deterministic rules; server modules orchestrate
  authority, rooms, timers, persistence, and Socket.IO; clients render a
  read-only mirror; simulations use the same shared rules and GameEngine.

### Evidence Language

Performance figures are targets to measure, not guarantees. Viva material must
use evidence-based terms such as server-authoritative, reproducible, validated,
empirically evaluated, and baseline comparison. It must not claim cheat-proof,
optimal, perfectly balanced, or best strategy without supporting evidence.

## Quick Reference

| # | Decision | Rule | Status |
|---|----------|------|--------|
| 1 | Building stacking | One building per hex | ✅ Kept |
| 2 | Factory for chains | Factory on source hex | ✅ Kept |
| 3 | Plains Factory chains | Local Energy yes, chain source no | ⚠️ Changed |
| 4 | Command Hub slot | Hub IS the building, no construction | ⚠️ Changed |
| 5 | Victory timing | Immediate after Dominion action | ✅ Kept |
| 6 | Disconnect handling | Turn auto-ends, no AI | ✅ Kept |
| 7 | Starting territory | 1 hex (validate via simulation) | ✅ Conditional |
| 8 | Networking | Socket.IO | ⚠️ Changed |
| 9 | State sync | Full state + event metadata | ⚠️ Changed |
| 10 | Terrain counts | Fixed: 25/11/11/9/5 | ⚠️ Changed |
| 11 | Chain exclusivity | One chain per source hex | 🆕 Added |
| 12 | Chain recalc timing | After every state-changing action | 🆕 Added |
