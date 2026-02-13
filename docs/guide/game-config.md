---
prev: { text: 'Start here', link: '/guide/start-here' }
next: { text: 'Quick start', link: '/guide/getting-started' }
---

# Game config

**Your game is one object.** The game config defines phases, which moves are allowed where, lifecycle hooks, and how phases flow. You pass the same config to **createGame**, **useBoardActions**, and **endTurn** / **endPhase** so the board applies actions and runs hooks with one source of truth.

---

## What you need to define

| Part | Purpose |
|------|--------|
| **setup** | (Optional) Run once when the game is created. Returns initial state. |
| **moves** | Global moves: allowed in **any** phase. Object: action name → reducer. |
| **turns** | (Optional) **onBegin** / **onEnd** — run when the board calls **endTurn()**. |
| **phases** | Phase definitions. Each phase can have **start**, **next**, **onBegin**, **onEnd**, and **moves** (allowed only in that phase). |

---

## Shape at a glance

```ts
const gameConfig: GameConfig = {
  // Function that returns the initial value of state.
  setup: (ctx) => ({ /* initial state */ }),

  // Global moves that are allowed in any phase.
  moves: {
    A: (state, payload, context) => ({ ...state, /* ... */ }),
  },

  turns: {
    // Function that runs when the board calls endTurn() before the turn/player advance.
    onBegin: (state, payload, context) => state,

    // Function that runs when the board calls endTurn() after the turn/player advance.
    onEnd:   (state, payload, context) => state,
  },

  phases: {
    A: {
      // The phase that is the initial phase.
      start: true,

      // Function that runs after the board calls endPhase() at the beginning of the next phase.
      onBegin: (state, payload, context) => state,

      // Function that runs after the board calls endPhase() at the end of the current phase.
      onEnd:   (state, payload, context) => state,

      // Moves that are allowed only in this phase.
      moves: {
        A: (state, payload, context) => ({ ...state, /* ... */ }),
      },

      // The phase that is the next phase.
      next: 'BET',
    },
    
    ...
  },
};
```

---

## Phase flow: `start` and `next`

- **Initial phase** — Give one phase **`start: true`**. The engine uses it when creating the game. If none has `start`, the first phase key is used.
- **Phase order** — Each phase can set **`next: 'PhaseName'`**. The engine walks this chain to get the ordered phase list and uses it for **endPhase()** (advance to next) and for Firestore.

So you don’t pass a separate `phaseOrder` array; it’s derived from the phase that has `start: true` and then following **next** until there’s no next or a cycle.

---

## Global vs phase moves

- **Top-level `moves`** — Allowed in **any** phase. Use for “concede”, “chat”, etc.
- **`phases[name].moves`** — Allowed **only in that phase**. Moves are colocated: the reducer lives next to the phase. The engine allows an action in phase `P` if it’s in **config.moves** or **config.phases[P].moves**.

---

## Lifecycle hooks

| Hook | When it runs |
|------|----------------|
| **setup(ctx)** | Once, when the game is created. Receives **SetupContext** (phase, turn 0, round 0, status, turnOrder, currentPlayerIndex). Return value is the initial state (replaces **initialState** from create options). |
| **phases[name].onEnd** | When the board calls **endPhase()** and we’re leaving this phase. Runs before the phase changes. |
| **phases[name].onBegin** | When the board calls **endPhase()** and we’re entering this phase. Runs after the phase has been updated in context. |
| **turns.onEnd** | When the board calls **endTurn()**, before the turn/player advance. |
| **turns.onBegin** | When the board calls **endTurn()**, after the turn/player advance. |

All hooks receive **state**, **payload** (empty `{}` for phase/turn transitions), and **context**. Return the next state (or the same state). The engine merges that state into the game doc.

---

## Using the config

**Create game** — Pass **gameConfig** to **createGame**. Phases and initial phase come from the config; if **setup** is defined, it runs and its return value is the initial state.

```ts
await createGame(db, boardId, { gameConfig });
```

**Board applies actions** — Pass the same **gameConfig** to **useBoardActions** (or **processPendingActions**). The engine validates the action against the current phase and runs the matching reducer.

```tsx
useBoardActions(gameId, role, snapshot, gameConfig);
```

**End turn / end phase** — Pass **gameConfig** (and full snapshot with **state**) so **turns.onEnd/onBegin** and **phase onEnd/onBegin** run.

```tsx
const endTurn   = useEndTurn(gameId, role, snapshot, gameConfig);
const endPhase  = useEndPhase(gameId, role, snapshot, gameConfig);
```

**UI** — Use **getAllowedMoveTypes(config, context.phase)** to know which actions are valid in the current phase (e.g. to enable/disable buttons).

```ts
const allowed = getAllowedMoveTypes(gameConfig, snapshot.context.phase);
if (allowed.has('placeBet')) { /* show Place bet button */ }
```

---

## Reducers (moves and hooks)

Every move and lifecycle hook is a function:

**`(state, payload, context) => state`**

- **state** — Current game state. Return the next state (immutable update).
- **payload** — For moves: what the player sent with **submitAction(type, payload)**. For hooks: empty object.
- **context** — **GameContext** plus **playerId** (who sent the action; empty string for system hooks). Use for “only current player”, “which phase”, etc. The engine already enforces that the *action type* is allowed in the current phase.

---

## Minimal example

One phase, one move. No setup, no turn/phase hooks.

```ts
const gameConfig: GameConfig = {
  phases: {
    play: {
      start: true,
      moves: {
        increment(state, payload) {
          return { ...state, score: (state.score ?? 0) + (payload.amount ?? 1) };
        },
      },
    },
  },
};
```

---

**Next:** [Quick start](/guide/getting-started) — install, provider, create/join, and wire the board and players with this config.
