# Hooks

All hooks must be used inside **NeonBoardProvider**. The provider supplies `db` (Firestore), `getCurrentUserId`, and optionally `getBoardId` to the tree.

---

## NeonBoardProvider

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| **db** | `Firestore` | Your Firestore instance. |
| **getCurrentUserId** | `() => string \| null` | Returns the current user id (e.g. from Firebase Auth). Use `() => null` for board-only apps. |
| **getBoardId** | `() => string` (optional) | Returns the board device id. If not provided, create game will use `getCurrentUserId()`. Use **getOrCreateBoardId** for board-only (no auth). |
| **children** | `ReactNode` | Your app. |

---

## useNeonBoardContext()

Returns `{ db, getCurrentUserId, getBoardId }`. Throws if used outside **NeonBoardProvider**.

---

## useCreateGame()

Create a new game; the caller becomes the board.

**Returns:** `createGame`, `gameId`, `joinCode`, `error`, `loading`

- **createGame(options?)** — `options`: **CreateGameOptions**
  - `joinCode?: string` — Custom join code (otherwise generated).
  - `initialState?: Record<string, unknown>` — Initial game state.
  - `initialPhase?: string` — First phase (default from `phases[0]` if `phases` set).
  - `phases?: string[]` — Ordered phases for phase-based games (e.g. `['lobby', 'play', 'ended']`).
  - `turnOrder?: string[]` — Turn order (player IDs). If omitted, join order is used.
  - `meta?: Record<string, unknown>` — Custom metadata.
  - Returns `Promise<CreateGameResult | null>`.

---

## useJoinGame()

Join a game by join code.

**Returns:** `joinGame`, `gameId`, `joinCode`, `role`, `playerId`, `error`, `loading`

- **joinGame(code, options?)** — `code`: string. `options`: **JoinGameOptions** (optional `playerId`, `playerDisplayName`). Returns `Promise<JoinGameResult | null>`.

---

## useGameState(gameId)

Subscribe to the live game document.

**Returns:** **GameStateSnapshot | null** (null while loading or when `gameId` is null).

Snapshot has **state** (your game data), **context** (turn, round, phase, status, turnOrder, currentPlayerId, etc.), **meta**, **boardId**, and **playerIds**. Use **snapshot.context** for “whose turn?”, “which phase?”, “is game ended?”.

---

## useSubmitAction(gameId, playerId)

For players: enqueue an action for the board to apply.

**Returns:** `submitAction`, `error`

- **submitAction(type, payload?)** — `type`: string. `payload`: optional `Record<string, unknown>`.

---

## useBoardActions(gameId, role, snapshot, actionMap)

**Board only.** Subscribes to pending actions and applies them with your **actionMap**. Call once in the board UI. Memoize **actionMap** (e.g. `useMemo`) so the effect doesn’t re-run every render.

**actionMap:** `Record<string, ActionReducer>` — each key is an action type; each value is `(state, payload, context) => newState`. **context** is **ActionContext** (engine state + `playerId` who sent the action).

---

## useEndTurn(gameId, role, snapshot)

**Board only.** Returns a function that advances to the next player and increments turn (and round when wrapping). Call it when the current player’s turn is over. Pass the current **snapshot** from **useGameState**.

---

## useEndPhase(gameId, role, snapshot)

**Board only.** Returns a function that advances to the next phase. Call with no args to use the configured phases list, or **endPhase(nextPhase)** to jump to a specific phase. Pass the current **snapshot**.

---

## useSetPhase(gameId, role)

**Board only.** Returns **setPhase(phase: string)** to set the current phase to any value.

---

## useSetTurnOrder(gameId, role)

**Board only.** Returns **setTurnOrder(turnOrder: string[])** to set or reshuffle the turn order (player IDs).

---

## useSetStatus(gameId, role)

**Board only.** Returns **setStatus(status: GameStatus)** to set game status (e.g. `'ended'`).

---

## useStoredSession()

Returns the last stored session for reconnection (**JoinGameResult | null**), or null if none or expired (7 days). Use to show a “Rejoin?” option.

---

## useLeaveGame()

Returns **leaveGame()** — call it when the user explicitly leaves the game to clear the stored session.
