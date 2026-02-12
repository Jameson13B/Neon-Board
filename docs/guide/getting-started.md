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

Wrap your app with **NeonBoardProvider**. You need **db** (Firestore) and either **getCurrentUserId** (players) or **getBoardId** (board), or both.

**Board-only (no auth):**

```jsx
import { getFirestore } from 'firebase/firestore';
import { NeonBoardProvider, getOrCreateBoardId } from 'neon-board';

<NeonBoardProvider db={db} getCurrentUserId={() => null} getBoardId={getOrCreateBoardId}>
  <App />
</NeonBoardProvider>
```

**With auth (players):**

```jsx
<NeonBoardProvider db={db} getCurrentUserId={() => getAuth().currentUser?.uid ?? null}>
  <App />
</NeonBoardProvider>
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

Pass the **same gameConfig** to **useBoardActions**, **useEndTurn**, and **useEndPhase** so the engine validates moves and runs lifecycle hooks.

```jsx
const gameConfig = useGameConfig();
const snapshot = useGameState(gameId);

useBoardActions(gameId, role, snapshot, gameConfig);

const endTurn  = useEndTurn(gameId, role, snapshot, gameConfig);
const endPhase = useEndPhase(gameId, role, snapshot, gameConfig);
// Call endTurn() or endPhase() when the board decides (e.g. button click)
```

---

## Next

- [Concepts](/guide/concepts) — Turn-based vs phase-based, terminology.
- [Firestore & rules](/guide/firestore) — Collections and security rules.
- [API Reference](/api) — Hooks, imperative API, **GameConfig** types.
