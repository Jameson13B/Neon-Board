---
prev: { text: 'Quick start', link: '/guide/getting-started' }
next: { text: 'Firestore & rules', link: '/guide/firestore' }
---

# Concepts

Optional reading. How Neon Board models **turns** and **phases**, and when to use which. For defining your game (phases, moves, hooks), see [Game config](/guide/game-config).

---

## Board and players

- **Board** — One device that is the single source of truth. It receives actions, runs your reducers and hooks, and writes state. Think: the shared screen or dealer.
- **Players** — Join with a code, see live state, and submit actions. They never write state directly.

---

## Turn-based vs phase-based

| Pattern | When to use |
|--------|-------------|
| **Turn-based** | One player at a time does their full turn (move, buy, play cards), then the next player. Example: Monopoly, Splendor. |
| **Phase-based** | Everyone is in the same step; when the step is done, you advance. Example: everyone bets → everyone gets cards → everyone acts → resolve. |
| **Hybrid** | Phases for big steps (e.g. `bet` → `play` → `resolve`), turn order inside a phase for “who acts first”. |

In the engine: set **turn order** (player IDs) and call **endTurn()** when the current player’s turn is over. Set **phases** in your [game config](/guide/game-config) (with **start** and **next**) and call **endPhase()** when the current phase is done. The engine never auto-advances; the board decides.

---

## Round, turn, phase

- **Round** — One full pass: either through every player’s turn (turn-based) or through all phases (phase-based). The engine increments **round** when the cycle wraps.
- **Turn** — A counter that increments each time the board calls **endTurn()**. The engine also tracks **current player** from **turn order**.
- **Phase** — A named step (e.g. `bet`, `play`). You define phases in your game config; the engine advances phase only when the board calls **endPhase()** or **setPhase()**.

---

## State and context

- **state** — Your game data (pieces, scores, cards). Writable via reducers and **updateGameState**.
- **context** — Engine state: turn, round, phase, status, turn order, current player. Read-only; change it only via **endTurn**, **endPhase**, **setPhase**, **setTurnOrder**, **setStatus**.

Every snapshot from **useGameState** has **state** and **context**. Reducers and lifecycle hooks receive **context** plus **playerId** (who sent the action, or empty for system hooks).

---

**Next:** [Firestore & rules](/guide/firestore) — Set up the `games` collection and security rules.
