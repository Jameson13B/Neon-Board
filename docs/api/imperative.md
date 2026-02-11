# Imperative API

Use the imperative API when you’re not using React, or when you need to call the same logic from outside components (e.g. in a callback or a non-React script). Pass a Firestore instance and, for create/join, the appropriate board or player id.

---

## Function reference

| Function | Description |
|----------|-------------|
| **createGame(db, boardId, options?)** | Create a new game; caller is board. Saves session. Returns `Promise<CreateGameResult>`. |
| **joinGame(db, joinCode, playerId, options?)** | Find game by join code and add user. Saves session. Returns `Promise<JoinGameResult>`. Throws if game not found. |
| **getOrCreateBoardId(options?)** | Return a persistent board id for this device (e.g. board-only, no auth). Uses localStorage; optional `{ storageKey }`. |
| **getStoredSession()** | Load last session from storage. Returns `JoinGameResult \| null`. |
| **leaveGame()** | Clear stored session. No arguments. |
| **subscribeToGame(db, gameId, onUpdate)** | Subscribe to game document. `onUpdate(snapshot: GameStateSnapshot)`. Returns unsubscribe function. |
| **subscribeToPendingActions(db, gameId, onActions)** | Subscribe to pending actions (by `createdAt`). `onActions(actions)`. Returns unsubscribe function. |
| **addPendingAction(db, gameId, playerId, type, payload)** | Add a pending action (players). Returns `Promise<string>` (action doc id). |
| **updateGameState(db, gameId, updates)** | Update game state (board only). **Only `state` and `meta`** are writable. Use engine APIs for turn/phase/status. |
| **endTurn(db, gameId, current)** | Advance to next player and increment turn (and round when wrapping). Board only. Pass a snapshot with `context` (e.g. from your subscription). |
| **endPhase(db, gameId, current, nextPhase?)** | Advance to next phase (or set to `nextPhase`). Board only. Pass a snapshot with `context`. |
| **setPhase(db, gameId, phase)** | Set phase to a specific value. Board only. |
| **setTurnOrder(db, gameId, turnOrder)** | Set turn order (player IDs). Board only. |
| **setStatus(db, gameId, status)** | Set game status (e.g. `'ended'`). Board only. |
| **processPendingActions(db, gameId, currentDoc, actions, actionMap)** | Apply actions with `actionMap`, update Firestore, delete processed actions. Call from board when new pending actions arrive. `currentDoc` must include `state`, `context` (or equivalent turn/round/phase/status/turnOrder/currentPlayerIndex/phases). |

---

## Example: board without React

You don’t need `NeonBoardProvider` if you only use the imperative API. Keep a reference to the current snapshot so you can pass it to `processPendingActions` and to `endTurn` / `endPhase` when needed.

```ts
import { getFirestore } from 'firebase/firestore';
import {
  createGame,
  subscribeToGame,
  subscribeToPendingActions,
  processPendingActions,
  endTurn,
} from 'neon-board';
import type { ActionMap, GameStateSnapshot } from 'neon-board';

const db = getFirestore(app);
const boardId = getOrCreateBoardId(); // or your auth uid

// Create game
const { gameId, joinCode } = await createGame(db, boardId, {
  initialState: { score: 0 },
  initialPhase: 'lobby',
});

// Keep latest snapshot for processPendingActions and endTurn
let currentSnapshot: GameStateSnapshot | null = null;

const actionMap: ActionMap = {
  increment(state, payload) {
    return { ...state, score: (state.score ?? 0) + (payload.amount ?? 1) };
  },
};

subscribeToGame(db, gameId, (snapshot) => {
  currentSnapshot = snapshot;
  console.log('State:', snapshot.state, 'Context:', snapshot.context);
});

subscribeToPendingActions(db, gameId, async (actions) => {
  if (actions.length === 0 || !currentSnapshot) return;
  const ctx = currentSnapshot.context;
  await processPendingActions(db, gameId, {
    state: currentSnapshot.state,
    turn: ctx.turn,
    round: ctx.round,
    phase: ctx.phase,
    status: ctx.status,
    turnOrder: ctx.turnOrder,
    currentPlayerIndex: ctx.currentPlayerIndex,
    phases: ctx.phases,
  }, actions, actionMap);
});

// When the current player ends their turn (e.g. from a UI or timer):
// await endTurn(db, gameId, currentSnapshot);
```

Use **endTurn(db, gameId, currentSnapshot)** or **endPhase(db, gameId, currentSnapshot)** whenever the board needs to advance turn or phase; pass the latest snapshot so the engine can compute the next values.
