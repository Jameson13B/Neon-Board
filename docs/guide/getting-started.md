---
prev: { text: 'Game config', link: '/guide/game-config' }
next: { text: 'Concepts', link: '/guide/concepts' }
---

# Quick start

Get a game running in a few steps. You need: a **game config**, a **provider**, **create/join**, and the board applying actions with the same config. See [Game config](/guide/game-config) for the full shape.

---

## 1. Install

```bash
npm install neon-board firebase
```

Peer deps: `firebase` (v11+), `react` (v17+) if you use hooks.

---

## 2. Provider

Wrap your app with **NeonGameProvider**. You need **db** (Firestore) and either **getCurrentUserId** (players) or **getBoardId** (board). You can also pass your **gameConfig** here so it's available everywhere.

**Board-only (no auth):**

```jsx
import { getFirestore } from 'firebase/firestore';
import { NeonGameProvider, getOrCreateBoardId } from 'neon-flow';
import { gameConfig } from './gameConfig';

<NeonGameProvider 
  db={db} 
  getCurrentUserId={() => null} 
  getBoardId={getOrCreateBoardId}
  gameConfig={gameConfig}
>
  <App />
</NeonGameProvider>
```

**With auth (players):**

```jsx
<NeonGameProvider 
  db={db} 
  getCurrentUserId={() => getAuth().currentUser?.uid ?? null}
  gameConfig={gameConfig}
>
  <App />
</NeonGameProvider>
```

---

## 3. Game config (one place)

Define your config once. Use **phases** with **start**, **next**, and **moves** (colocated). Top-level **moves** = global (any phase).

```jsx
import { useMemo } from 'react';
import type { GameConfig } from 'neon-board';

function useGameConfig() {
  return useMemo((): GameConfig => ({
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
  }), []);
}
```

---

## 4. Create game (board)

Pass **gameConfig** so phases and initial phase come from it. Same config will be used for the board below.

```jsx
const gameConfig = useGameConfig();
const { createGame, joinCode } = useCreateGame();

await createGame({ gameConfig, initialState: { score: 0 } });
// Show joinCode so players can join
```

---

## 5. Join (players)

```jsx
const { joinGame } = useJoinGame();
await joinGame(joinCode);
```

---

## 6. Read state (any role)

```jsx
const snapshot = useGameState(gameId);
// snapshot.state, snapshot.context (phase, turn, currentPlayerId, etc.)
```

---

## 7. Submit actions (players)

```jsx
const { submitAction } = useSubmitAction(gameId, playerId);
submitAction('increment', { amount: 1 });
```

---

## 8. Board: apply actions and advance

Wrap your board component in **NeonBoardProvider** to automatically handle state and actions. Then use **useNeonBoard** to get everything you need.

```jsx
import { NeonBoardProvider, useNeonBoard } from 'neon-flow';

function GameScreen({ gameId }) {
  // role="board" means this device applies actions
  return (
    <NeonBoardProvider gameId={gameId} role="board">
      <GameBoard />
    </NeonBoardProvider>
  );
}

function GameBoard() {
  const { snapshot, endTurn, endPhase } = useNeonBoard();
  
  // endTurn() and endPhase() automatically use the config from provider
  return <button onClick={() => endTurn()}>End Turn</button>;
}
```

---

## Next

- [Concepts](/guide/concepts) — Turn-based vs phase-based, terminology.
- [Firestore & rules](/guide/firestore) — Collections and security rules.
- [API Reference](/api/) — Hooks, imperative API, **GameConfig** types.
