---
prev: { text: 'Imperative API', link: '/api/imperative' }
next: false
---

# Types

All types are exported from **neon-board**. The main type you define is **GameConfig**. Use the rest to type state, snapshot, and options.

---

## Game config (define your game)

**GameConfig&lt;State&gt;**

| Field | Type | Description |
|-------|------|-------------|
| **setup** | `(ctx: SetupContext) => State` | Optional. Run once when the game is created. Return initial state. |
| **moves** | `Record<string, ActionReducer<State>>` | Global moves (allowed in any phase). Key = action type, value = reducer. |
| **turns** | **TurnConfig&lt;State&gt;** | Optional. **onBegin** / **onEnd** run when the board calls **endTurn()**. |
| **phases** | `Record<string, PhaseConfig<State>>` | Phase definitions. Key = phase name. |

**PhaseConfig&lt;State&gt;**

| Field | Type | Description |
|-------|------|-------------|
| **start** | `boolean` | If true, this phase is the initial phase (exactly one). |
| **onBegin** | **ActionReducer&lt;State&gt;** | Optional. Run when entering this phase. |
| **onEnd** | **ActionReducer&lt;State&gt;** | Optional. Run when leaving this phase. |
| **moves** | `Record<string, ActionReducer<State>>` | Moves allowed only in this phase. Colocated reducers. |
| **next** | `string` | Next phase name. Engine derives phase order from start → next chain. |

**TurnConfig&lt;State&gt;** — **onBegin?**, **onEnd?** (ActionReducer). Run when the board calls **endTurn()**.

**SetupContext** — **phase**, **turn**, **round**, **status**, **turnOrder**, **currentPlayerIndex**. No playerId. Passed to **setup()**.

**ActionReducer&lt;State&gt;** — `(state, payload, context) => state`. Same for moves and lifecycle hooks.

**ActionContext** — **GameContext** & { **playerId**: string }. Passed to every reducer and hook.

See [Game config](/guide/game-config) for usage.

---

## Snapshot and context (what clients read)

**GameStateSnapshot&lt;State&gt;** — **state**, **context**, **meta?**, **boardId**, **playerIds**. From **useGameState** or **subscribeToGame**.

**GameContext** — **turn**, **round**, **phase**, **status**, **turnOrder**, **currentPlayerIndex**, **currentPlayerId?**, **phases?**. Read-only engine state.

---

## Roles and status

**Role** — `'board' | 'player'`.

**GameStatus** — `'waiting' | 'active' | 'ended'`.

---

## Create/join options and results

**CreateGameOptions** — **gameConfig?** (drives phases, initial phase, and setup), **joinCode?**, **initialState?**, **initialPhase?**, **phases?**, **turnOrder?**, **meta?**.

**JoinGameOptions** — **playerId?**, **playerDisplayName?**.

**CreateGameResult** — **gameId**, **joinCode**, **role: 'board'**.

**JoinGameResult** — **gameId**, **joinCode**, **role**, **playerId**.

---

## Firestore and session

**GameDoc** — Stored in `games/{gameId}`. **PendingActionDoc** — Stored in `games/{gameId}/pendingActions`.

**StoredSession** — **gameId**, **joinCode**, **role**, **playerId**, **storedAt**.

---

## Helpers (state)

**getInitialPhaseFromConfig(config)** — Phase with **start: true**, or first phase key.

**getPhaseOrderFromConfig(config)** — Ordered phase list from start → next chain.

**getAllowedMoveTypes(config, phase)** — Set of action types allowed in that phase (for UI).
