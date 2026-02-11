# Concepts

Start here. This page explains how Neon Board works and how to choose the right turn structure for your game — so you can build with confidence and almost no friction.

## What is Neon Board?

Neon Board is a multiplayer game framework that keeps a single shared game in sync across devices using Firebase Firestore. There are two kinds of participants:

- **Board** — One device (or screen) that is the *single source of truth*. It receives actions from players, applies them using your logic, and writes the result back. Think: the shared tabletop, the TV, or the dealer screen.
- **Players** — Devices that join the game, see live state, and *submit actions* (e.g. “move here”, “play this card”). They do not write game state directly; the board does.

Players send actions; the board applies them. State, turn order, and phases are stored in Firestore and updated only by the board. Everyone subscribes to the same game document and sees the same state in real time.


## How it works (high level)

1. **Create or join** — The board creates a game and gets a join code. Players join with that code. Join order can be used as turn order, or you set it yourself.
2. **State and actions** — The game has a **state** object (your board data: pieces, scores, cards, etc.) and optional **turn/phase/round** (who goes when, which step the game is in). You define **actions** (e.g. `move`, `playCard`) and **reducers**: functions that take current state + payload and return the next state. Only the board runs those reducers.
3. **Flow** — Players call `submitAction(type, payload)`. Actions are stored in Firestore. The board subscribes to pending actions, runs each through your action map, then writes the new state (and optionally advances turn/phase) once. So: one source of truth, no conflicting writes.
4. **Turn and phase** — The engine tracks **turn** (whose turn / how many turn-advances), **phase** (e.g. `lobby` → `play` → `vote` → `ended`), and **round** (one full cycle of turns or phases). You decide *when* to advance by calling `endTurn()` or `endPhase()`; the engine never advances on its own.

That’s the model: board applies actions and drives turn/phase; players submit actions and read state.


## Turn types

Different games progress in different ways. Neon Board supports two main patterns so you can pick the one that fits.

### Turn-based

**One full turn at a time per player.**

- One player does everything for their turn (roll, move, buy, trade, etc.), then their turn is over.
- The next player in order does their full turn, and so on.
- After the last player, we’re back to the first — that’s one **round**.

**Examples:** Monopoly, Splendor, most traditional board games.

**In the engine:** You set **turn order** (player IDs). The engine tracks **current player** and **turn** count. When the current player is done, the board calls **`endTurn()`**. The engine moves to the next player and increments **turn**; when the order wraps back to the first player, it increments **round**.


### Phase-based

**Everyone does the same step together, then you move to the next step.**

- Phase 1: everyone bets (or places ante).
- Phase 2: everyone is dealt cards (or the system deals).
- Phase 3: everyone acts (e.g. hit/stand, split hand).
- Phase 4: resolution / compare / payout.
- Then the next **round** (next hand) starts.

**Examples:** Pai Gow, Blackjack, many card games where the table moves in lockstep.

**In the engine:** You set a list of **phases** (e.g. `['bet', 'deal', 'act', 'resolve']`). The engine tracks the **current phase**. When that step is done (e.g. everyone has bet), the board calls **`endPhase()`**. The engine moves to the next phase; when the list wraps back to the first phase, it increments **round**. Within a phase you can still use **turn order** if someone must act first (e.g. first base in Blackjack).


## Which turn type fits my game?

Use this as a quick guide:

| If your game… | Use |
|---------------|-----|
| Has one player at a time doing their full turn (move, buy, play cards, etc.), then the next player | **Turn-based** |
| Has the whole table in the same step (everyone bets → everyone gets cards → everyone acts → resolve), then repeat | **Phase-based** |
| Has both (e.g. a “bet” phase, then “play” where each player takes a full turn) | **Hybrid** — use phases for the big steps and turn order inside the “play” phase |

- **Turn-based:** Configure **turn order** (or use join order). Use **`endTurn()`** when the active player’s turn is over. Use **phases** only if you have big stages (e.g. `setup` → `play` → `scoring`).
- **Phase-based:** Configure **phases** (e.g. `['bet', 'deal', 'act', 'resolve']`). Use **`endPhase()`** when the current phase is done. Optionally set **turn order** for “who acts first” within a phase.
- **Hybrid:** Set both **phases** and **turn order**; call **`endPhase()`** between stages and **`endTurn()`** when the current player’s turn is over in a turn-based phase.


## Round, turn, and phase (terminology)

- **Round** — A single pass through “everyone’s turn” (turn-based) or “all phases” (phase-based). The engine stores **round** explicitly and increments it when the cycle wraps (back to first player or first phase).
- **Turn** — In turn-based games, **turn** is a counter that increments each time **`endTurn()`** is called. The engine also tracks **current player** (from **turn order**).
- **Phase** — A named step (e.g. `bet`, `play`). You set **phases** at create time; the engine advances phase only when the board calls **`endPhase()`** or **`setPhase()`**.

**Important:** The engine **never** auto-ends a turn or phase. Your app (usually the board) decides when to call **`endTurn()`** or **`endPhase()`** — for example when the player taps “End turn”, when everyone has submitted a bet, or when the dealer finishes resolving. That keeps control in your game logic.

## State, context, and metadata

Every live game snapshot (and every reducer when the board processes an action) exposes three kinds of data:

| | What it is | Where it's used | Writable by you? |
|---|------------|------------------|-------------------|
| **state** | Your game board data (pieces, scores, cards, etc.) | `snapshot.state`; reducer first argument | Yes, via `updateGameState(db, gameId, { state })` |
| **context** | Engine state: turn, round, phase, status, turn order, current player, phases list | `snapshot.context`; reducer third argument `context` | No; use engine APIs (`endTurn`, `endPhase`, `setPhase`, etc.) |
| **meta** | Optional custom metadata (e.g. game name, config) | `snapshot.meta` | Yes, via `updateGameState(db, gameId, { meta })` |

- **Clients:** When you subscribe with **`useGameState(gameId)`**, you get a **`GameStateSnapshot`** with **`state`**, **`context`**, and **`meta`**. Use **`context`** for logic and UI: “Is it my turn?” (`context.currentPlayerId === myPlayerId`), “Which phase?” (`context.phase`), “Is the game ended?” (`context.status === 'ended'`).
- **Board / reducers:** When the board processes an action, your reducer receives **`(state, payload, context)`**. **`context`** includes everything in **`GameContext`** plus **`playerId`** (who sent the action). So you can enforce rules like “only the current player can move” or “this action is allowed only in the voting phase.”

## Control: You vs the engine

- **You control:** Game **state** (board data) and **meta** (custom metadata) via **`updateGameState(db, gameId, { state?, meta? })`**. You also decide *when* to advance by calling **`endTurn()`**, **`endPhase()`**, **`setPhase()`**, **`setTurnOrder()`**, or **`setStatus()`**.
- **Engine controls:** **Turn**, **round**, **phase**, **turn order**, **current player**, and **status** are not writable through **`updateGameState`**. They change only through the engine APIs above (or when the board runs **`processPendingActions`**, which updates state and keeps turn/phase/round in sync). That way clients can’t arbitrarily change whose turn it is or skip phases.

Once you know whether your game is turn-based, phase-based, or hybrid — and when you’ll call **`endTurn()`** or **`endPhase()`** — you’re ready to code.

---

**Next:** [Getting started](/guide/getting-started) — install Neon Board, add the provider, create or join a game, and wire up state and actions.
