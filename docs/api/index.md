---
prev: { text: 'Reconnection', link: '/guide/reconnection' }
next: { text: 'Hooks', link: '/api/hooks' }
---

# API Reference

Neon Board exposes a **React API** (provider + hooks), an **imperative API** (standalone functions for use without React or inside effects), and **TypeScript types**. Use the provider and hooks in React apps; use the imperative API in vanilla JS or when you need to call the same logic outside components.

---

## React (provider + hooks)

| Export | Description |
|--------|-------------|
| **NeonBoardProvider** | Wraps your app; provides `db`, `getCurrentUserId`, and optional `getBoardId`. |
| **useNeonBoardContext()** | Returns `{ db, getCurrentUserId, getBoardId }`. Use inside the provider. |
| **useCreateGame()** | Create a game (caller = board). Returns `createGame`, `gameId`, `joinCode`, `error`, `loading`. |
| **useJoinGame()** | Join by code. Returns `joinGame`, `gameId`, `joinCode`, `role`, `playerId`, `error`, `loading`. |
| **useGameState(gameId)** | Subscribe to live game. Returns `GameStateSnapshot \| null`. |
| **useSubmitAction(gameId, playerId)** | Submit an action (players). Returns `submitAction`, `error`. |
| **useBoardActions(gameId, role, snapshot, actionMap)** | Board only. Applies pending actions with your action map. |
| **useEndTurn(gameId, role, snapshot)** | Board only. Advance to next player; increment turn (and round when wrapping). |
| **useEndPhase(gameId, role, snapshot)** | Board only. Advance to next phase (or pass `nextPhase` to jump). |
| **useSetPhase(gameId, role)** | Board only. Set phase to a specific value. |
| **useSetTurnOrder(gameId, role)** | Board only. Set turn order (player IDs). |
| **useSetStatus(gameId, role)** | Board only. Set game status (e.g. `'ended'`). |
| **useStoredSession()** | Last stored session for reconnection (`JoinGameResult \| null`). |
| **useLeaveGame()** | Returns `leaveGame()` to clear stored session. |

---

## Imperative API

Use when not using React or when calling from outside components. Pass a Firestore instance; for create/join, pass board or player id as needed.

| Function | Description |
|----------|-------------|
| **createGame(db, boardId, options?)** | Create a game; caller is board. Saves session. Returns `Promise<CreateGameResult>`. |
| **joinGame(db, joinCode, playerId, options?)** | Find by join code and add user. Saves session. Returns `Promise<JoinGameResult>`. Throws if not found. |
| **getOrCreateBoardId(options?)** | Persistent board id for this device (e.g. board-only, no auth). Uses localStorage. |
| **getStoredSession()** | Load last session. Returns `JoinGameResult \| null`. |
| **leaveGame()** | Clear stored session. |
| **subscribeToGame(db, gameId, onUpdate)** | Subscribe to game doc. `onUpdate(snapshot: GameStateSnapshot)`. Returns unsubscribe. |
| **subscribeToPendingActions(db, gameId, onActions)** | Subscribe to pending actions (by createdAt). Returns unsubscribe. |
| **addPendingAction(db, gameId, playerId, type, payload)** | Add a pending action (players). Returns `Promise<string>` (action id). |
| **updateGameState(db, gameId, updates)** | Board only. **Only `state` and `meta`** are writable. |
| **endTurn(db, gameId, current)** | Board only. Advance turn; pass snapshot (with `context`). |
| **endPhase(db, gameId, current, nextPhase?)** | Board only. Advance phase; pass snapshot. Optional `nextPhase` to jump. |
| **setPhase(db, gameId, phase)** | Board only. Set phase to a value. |
| **setTurnOrder(db, gameId, turnOrder)** | Board only. Set turn order (player IDs). |
| **setStatus(db, gameId, status)** | Board only. Set status (e.g. `'ended'`). |
| **processPendingActions(db, gameId, currentDoc, actions, actionMap)** | Board only. Apply actions, update Firestore, delete processed actions. |

---

## Types

All public types are exported from `neon-board`: **Role**, **GameStatus**, **GameDoc**, **GameContext**, **GameStateSnapshot**, **ActionMap**, **ActionReducer**, **ActionContext**, **CreateGameOptions**, **JoinGameOptions**, **CreateGameResult**, **JoinGameResult**, **StoredSession**, and more.

| Page | Description |
|------|-------------|
| [Hooks](/api/hooks) | Provider, context, and every hook in detail. |
| [Imperative API](/api/imperative) | All standalone functions with examples. |
| [Types](/api/types) | TypeScript interfaces and types. |
