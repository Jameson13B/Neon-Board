---
prev: { text: 'Reconnection', link: '/guide/reconnection' }
next: { text: 'Hooks', link: '/api/hooks' }
---

# API Reference

Your game is defined by a **game config** (**GameConfig**): **setup**, **moves** (global), **turns** (onBegin/onEnd), and **phases** (each with **start**, **next**, **onBegin**, **onEnd**, **moves**). Pass this config to **NeonGameProvider** so it's available everywhere. Full shape: [Game config](/guide/game-config) and [Types](/api/types).

---

## React (hooks)

| Export | Description |
|--------|-------------|
| **NeonBoardProvider** | Wraps app; provides db, getCurrentUserId, getBoardId. |
| **useNeonBoardContext()** | Returns { db, getCurrentUserId, getBoardId }. |
| **useCreateGame()** | createGame(options). Pass **gameConfig** so phases/setup come from it. |
| **useJoinGame()** | joinGame(code). |
| **useGameState(gameId)** | Live snapshot (state, context, meta). |
| **useSubmitAction(gameId, playerId)** | submitAction(type, payload). |
| **useBoardActions(gameId?, role?, snapshot?, gameConfig?)** | Board only. Applies pending actions. Infers args from context. |
| **useEndTurn(gameId?, role?, snapshot?, gameConfig?)** | Board only. Advance turn. Infers args from context. |
| **useEndPhase(gameId?, role?, snapshot?, gameConfig?)** | Board only. Advance phase. Infers args from context. |
| **useSetPhase**, **useSetTurnOrder**, **useSetStatus** | Board only. |
| **useStoredSession()**, **useLeaveGame()** | Reconnection. |

---

## Imperative API

Same functions for use without React. Pass **db**, **gameId**, and snapshot/options as needed.

| Function | Description |
|----------|-------------|
| **createGame(db, boardId, options?)** | Create game. Use **options.gameConfig** for phases and setup. |
| **joinGame(db, joinCode, playerId, options?)** | Join by code. |
| **processPendingActions(db, gameId, currentDoc, actions, gameConfig)** | Board only. Apply actions with gameConfig. |
| **endTurn(db, gameId, current, gameConfig?)** | Board only. Pass full snapshot; gameConfig for turn hooks. |
| **endPhase(db, gameId, current, nextPhase?, gameConfig?)** | Board only. gameConfig for phase hooks. |
| **setPhase**, **setTurnOrder**, **setStatus** | Board only. |
| **subscribeToGame**, **subscribeToPendingActions**, **addPendingAction**, **updateGameState** | Subscribe and write. |

---

## Types and helpers

**GameConfig**, **PhaseConfig**, **TurnConfig**, **SetupContext**, **ActionReducer**, **ActionContext**, **GameStateSnapshot**, **GameContext**, **CreateGameOptions**, **JoinGameOptions**, and more. **getInitialPhaseFromConfig**, **getPhaseOrderFromConfig**, **getAllowedMoveTypes** — see [Types](/api/types).

| Page | Description |
|------|-------------|
| [Types](/api/types) | GameConfig shape, PhaseConfig, TurnConfig, snapshot, options. |
| [Hooks](/api/hooks) | Each hook in detail. |
| [Imperative API](/api/imperative) | All functions with examples. |
