# Types

All types are exported from **neon-board**. Use them to type your state, action maps, and snapshot.

---

## Roles and status

- **Role** — `'board' | 'player'`. Board is the single source of truth; players submit actions.
- **GameStatus** — `'waiting' | 'active' | 'ended'`.

---

## Game document (Firestore)

- **GameDoc** — Stored in `games/{gameId}`.
  - **joinCode**, **state**, **turn**, **round**, **phase**, **status**
  - **turnOrder**, **currentPlayerIndex**, **phases** (optional)
  - **boardId**, **playerIds**, **createdAt**, **meta** (optional)

- **PendingActionDoc** — Stored in `games/{gameId}/pendingActions`.
  - **type**, **payload**, **playerId**, **createdAt**

---

## Snapshot and context

- **GameStateSnapshot&lt;State&gt;** — What you get from **useGameState** or **subscribeToGame**.
  - **state**: State — Your game board data.
  - **context**: GameContext — Engine state (turn, round, phase, status, turn order, current player, phases).
  - **meta?**: Record&lt;string, unknown&gt; — Optional metadata.
  - **boardId**, **playerIds**

- **GameContext** — Read-only engine state (use **snapshot.context** or reducer **context**).
  - **turn**, **round**, **phase**, **status**
  - **turnOrder**, **currentPlayerIndex**, **currentPlayerId?**, **phases?**

---

## Actions (reducers)

- **ActionReducer&lt;State&gt;** — `(state: State, payload: Record<string, unknown>, context: ActionContext) => State`
  - **context** is **ActionContext**: **GameContext** plus **playerId** (who sent the action). Run only on the board.

- **ActionMap&lt;State&gt;** — `Record<string, ActionReducer<State>>` (action type → reducer).

- **ActionContext** — **GameContext** & { **playerId**: string }. Passed to every reducer.

---

## Options and results

- **CreateGameOptions** — Optional: **joinCode**, **initialState**, **initialPhase**, **phases**, **turnOrder**, **meta**.
- **JoinGameOptions** — Optional: **playerId**, **playerDisplayName**.
- **CreateGameResult** — **gameId**, **joinCode**, **role: 'board'**.
- **JoinGameResult** — **gameId**, **joinCode**, **role**, **playerId**.

---

## Session and provider

- **StoredSession** — **gameId**, **joinCode**, **role**, **playerId**, **storedAt**. Stored in localStorage; max age 7 days.
- **NeonBoardContextValue** — **db**: Firestore; **getCurrentUserId**: () => string | null; **getBoardId?**: () => string.
- **NeonBoardProviderProps** — Props for **NeonBoardProvider**.
