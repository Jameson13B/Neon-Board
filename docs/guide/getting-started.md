# Getting started

Read [Concepts](/guide/concepts) first for a high-level overview and to choose turn-based vs phase-based for your game.

By the end of this guide you’ll have: a game that can be created and joined, live state on all devices, players submitting actions, and the board applying them. Optionally you’ll see how to advance turn or phase from the board.

---

## 1. Install

```bash
npm install neon-board firebase
```

**Peer dependencies:** `firebase` (v11+), `react` (v17+) if you use the hooks.

---

## 2. Set up the provider

You need a Firestore instance and a way to identify the **board** and **players**.

- **Board** — The device that runs the game (TV, shared screen). It doesn’t need user auth; Neon Board can generate and persist a board id (e.g. in `localStorage`).
- **Players** — Devices that join and submit actions. They usually have a user id (e.g. from Firebase Auth).

**Board-only app (no auth):**

```jsx
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { NeonBoardProvider, getOrCreateBoardId } from 'neon-board';

const app = initializeApp({ /* your config */ });
const db = getFirestore(app);

export default function BoardApp() {
  return (
    <NeonBoardProvider
      db={db}
      getCurrentUserId={() => null}
      getBoardId={getOrCreateBoardId}
    >
      <GameApp />
    </NeonBoardProvider>
  );
}
```

`getOrCreateBoardId` returns a persistent id for this device (stored in `localStorage`). You can pass options: `getOrCreateBoardId({ storageKey: 'my-app-board-id' })`.

**Player app (with auth):**

```jsx
import { getAuth } from 'firebase/auth';
import { NeonBoardProvider } from 'neon-board';

function getCurrentUserId() {
  return getAuth(app).currentUser?.uid ?? null;
}

export default function PlayerApp() {
  return (
    <NeonBoardProvider db={db} getCurrentUserId={getCurrentUserId}>
      <GameApp />
    </NeonBoardProvider>
  );
}
```

**One app for both (e.g. different routes):** Pass both `getBoardId` and `getCurrentUserId`. Creating a game uses the board id; joining uses the current user id.

---

## 3. Create or join a game

**Create a game (this device becomes the board):**

```jsx
import { useCreateGame } from 'neon-board';

function CreateScreen() {
  const { createGame, gameId, joinCode, error, loading } = useCreateGame();

  const handleCreate = async () => {
    const result = await createGame({
      initialState: { score: 0 },
      initialPhase: 'lobby',
      // Optional: turn-based (use join order as turn order) or phase-based:
      // phases: ['lobby', 'play', 'ended'],
      // turnOrder: [],  // or pass player ids when you want a fixed order
    });
    if (result) {
      // Go to board view; show result.joinCode so others can join
    }
  };

  return (
    <button onClick={handleCreate} disabled={loading}>
      {loading ? 'Creating…' : 'New game'}
    </button>
  );
}
```

**Join as a player (by code):**

```jsx
import { useState } from 'react';
import { useJoinGame } from 'neon-board';

function JoinScreen() {
  const [code, setCode] = useState('');
  const { joinGame, gameId, role, playerId, error, loading } = useJoinGame();

  const handleJoin = async () => {
    await joinGame(code);
    // Go to game view; role is 'board' or 'player'
  };

  return (
    <>
      <input
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="Join code"
      />
      <button onClick={handleJoin} disabled={loading}>Join</button>
    </>
  );
}
```

---

## 4. Read state and submit actions

**Read live state (any role):**

Every subscriber gets the same snapshot: **`state`** (your game data), **`context`** (turn, phase, round, whose turn, etc.), and **`meta`** (optional).

```jsx
import { useGameState } from 'neon-board';

function GameView({ gameId }) {
  const snapshot = useGameState(gameId);
  if (!snapshot) return <div>Loading…</div>;
  return (
    <div>
      <p>Phase: {snapshot.context.phase}, Turn: {snapshot.context.turn}</p>
      <p>Score: {snapshot.state.score ?? 0}</p>
    </div>
  );
}
```

**Players submit actions:**

```jsx
import { useSubmitAction } from 'neon-board';

function PlayerControls({ gameId, playerId }) {
  const { submitAction, error } = useSubmitAction(gameId, playerId);
  return (
    <button onClick={() => submitAction('increment', { amount: 1 })}>
      +1
    </button>
  );
}
```

**Board applies actions:**

Define an **action map**: each key is an action type, each value is a reducer `(state, payload, context) => newState`. The board subscribes to pending actions and runs them through this map. Memoize **`actionMap`** (e.g. with `useMemo`) so the effect doesn’t re-run every render.

```jsx
import { useGameState, useBoardActions } from 'neon-board';
import { useMemo } from 'react';

function BoardView({ gameId, role }) {
  const snapshot = useGameState(gameId);
  const actionMap = useMemo(() => ({
    increment(state, payload, context) {
      const amount = payload.amount ?? 1;
      return { ...state, score: (state.score ?? 0) + amount };
    },
  }), []);
  useBoardActions(gameId, role, snapshot, actionMap);

  return <div>Board: {JSON.stringify(snapshot?.state)}</div>;
}
```

---

## 5. Advance turn or phase (board only)

When the current player’s turn is over (turn-based) or the current phase is done (phase-based), the **board** calls **`endTurn()`** or **`endPhase()`**. Pass the current snapshot (from **`useGameState`**); the engine updates turn/phase/round.

```jsx
import { useGameState, useEndTurn, useEndPhase } from 'neon-board';

function BoardControls({ gameId, role }) {
  const snapshot = useGameState(gameId);
  const endTurn = useEndTurn(gameId, role, snapshot);
  const endPhase = useEndPhase(gameId, role, snapshot);

  return (
    <>
      <button onClick={() => endTurn()} disabled={role !== 'board' || !snapshot}>
        End turn
      </button>
      <button onClick={() => endPhase()} disabled={role !== 'board' || !snapshot}>
        Next phase
      </button>
    </>
  );
}
```

Use **`endPhase(nextPhase)`** to jump to a specific phase (e.g. `endPhase('ended')`). Use **`setPhase(db, gameId, phase)`** or **`setStatus(db, gameId, 'ended')`** for full control.

---

## Next steps

- **[Firestore & rules](/guide/firestore)** — Set up the `games` collection and security rules so only the board can write state and only players in the game can submit actions.
- **[Reconnection](/guide/reconnection)** — Use the stored session to show a “Rejoin?” option when users return.
- **[API Reference](/api/)** — Hooks, imperative API, and types for everything above.
