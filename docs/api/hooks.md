---
prev: { text: 'Overview', link: '/api' }
next: { text: 'Imperative API', link: '/api/imperative' }
---

# Hooks

All hooks must be used inside **NeonGameProvider**. The provider supplies `db` (Firestore) and `gameConfig` to the tree.

For the best experience, wrap your game component in **NeonBoardProvider** and use **useNeonBoard**.

---

## NeonGameProvider

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| **db** | `Firestore` | Your Firestore instance. |
| **getCurrentUserId** | `() => string \| null` | Returns the current user id (e.g. from Firebase Auth). Use `() => null` for board-only apps. |
| **getBoardId** | `() => string` (optional) | Returns the board device id. If not provided, create game will use `getCurrentUserId()`. Use **getOrCreateBoardId** for board-only (no auth). |
| **gameConfig** | `GameConfig` (optional) | Global game configuration. If provided, all hooks will use this by default. |
| **children** | `ReactNode` | Your app. |

---

## NeonBoardProvider

Wraps a specific game instance. Automatically fetches state and, if `role="board"`, processes actions.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| **gameId** | `string` | The ID of the game to connect to. |
| **role** | `'board' \| 'player'` | Default `'player'`. If `'board'`, it will run **useBoardActions** automatically. |
| **children** | `ReactNode` | Your game UI. |

---

## useNeonBoard()

Composite hook that returns everything you need for the active game. Must be used inside **NeonBoardProvider**.

**Returns:**
- **gameId**: `string`
- **role**: `'board' \| 'player'`
- **snapshot**: `GameStateSnapshot | null`
- **endTurn()**: Function to end the turn (board only).
- **endPhase(nextPhase?)**: Function to end the phase (board only).
- **setPhase(phase)**: Function to set phase (board only).
- **setTurnOrder(ids)**: Function to set turn order (board only).
- **setStatus(status)**: Function to set status (board only).
- **submitAction(type, payload?)**: Function to submit an action (players).

---

## useNeonGameContext()

Returns `{ db, getCurrentUserId, getBoardId, gameConfig }`. Throws if used outside **NeonGameProvider**.

---

## useCreateGame()

Create a new game; the caller becomes the board.

**Returns:** `createGame`, `gameId`, `joinCode`, `error`, `loading`

- **createGame(options?)** — `options`: **CreateGameOptions**
  - `gameConfig?: GameConfig` — If set, phases and initial phase are derived. If not set, uses `gameConfig` from **NeonGameProvider**.
  - `joinCode?`, `initialState?`, `initialPhase?`, `phases?`, `turnOrder?`, `meta?` — See [Types](/api/types).
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

---

## useSubmitAction(gameId?, playerId?)

For players: enqueue an action for the board to apply. If args are omitted, infers them from **NeonBoardProvider** and **NeonGameProvider**.

**Returns:** `submitAction`, `error`

- **submitAction(type, payload?)** — `type`: string. `payload`: optional `Record<string, unknown>`.

---

## useBoardActions(gameId?, role?, snapshot?, gameConfig?)

**Board only.** Subscribes to pending actions and applies them. Call once in the board UI (or use **NeonBoardProvider** which does this for you).

- If args are omitted, infers them from **NeonBoardProvider** and **NeonGameProvider**.
- **gameConfig** is required (either passed or in provider) to validate moves and run reducers.

---

## useEndTurn(gameId?, role?, snapshot?, gameConfig?)

**Board only.** Returns a function that advances to the next player and increments turn.

- If args are omitted, infers them from **NeonBoardProvider** and **NeonGameProvider**.
- **gameConfig** is used to run **turns.onEnd** / **turns.onBegin**.

---

## useEndPhase(gameId?, role?, snapshot?, gameConfig?)

**Board only.** Returns a function that advances to the next phase.

- If args are omitted, infers them from **NeonBoardProvider** and **NeonGameProvider**.
- **gameConfig** is used to run phase **onEnd** / **onBegin**.

---

## useSetPhase(gameId?, role?)

**Board only.** Returns **setPhase(phase: string)** to set the current phase to any value.

---

## useSetTurnOrder(gameId?, role?)

**Board only.** Returns **setTurnOrder(turnOrder: string[])** to set or reshuffle the turn order (player IDs).

---

## useSetStatus(gameId?, role?)

**Board only.** Returns **setStatus(status: GameStatus)** to set game status (e.g. `'ended'`).

---

## useStoredSession()

Returns the last stored session for reconnection (**JoinGameResult | null**), or null if none or expired (7 days). Use to show a “Rejoin?” option.

---

## useLeaveGame()

Returns **leaveGame()** — call it when the user explicitly leaves the game to clear the stored session.
