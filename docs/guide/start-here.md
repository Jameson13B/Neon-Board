---
prev: false
next: { text: 'Game config', link: '/guide/game-config' }
---

# Start here

Neon Board is a multiplayer game framework that keeps one shared game in sync across devices using Firebase Firestore. One device is the **board** (single source of truth); others are **players** that join and submit actions. The board applies those actions using your game logic and writes the result. Everyone sees the same state in real time.

---

## What you need

1. **A game config** — One object: phases, moves (global and per-phase), and optional setup/lifecycle hooks. [Define it →](/guide/game-config)
2. **Create a game** — Pass that config to **createGame**. Phases and initial state (or **setup()**) come from the config.
3. **Board applies actions** — Pass the same config to **useBoardActions** so the board validates and runs the right reducers. Use the same config with **endTurn** / **endPhase** so lifecycle hooks run.
4. **Players submit actions** — **submitAction(type, payload)**. The engine only allows moves that are valid for the current phase.

---

## Where to go

| If you want to… | Go to |
|-----------------|--------|
| **Define your game** (phases, moves, hooks) | [Game config](/guide/game-config) |
| **Get running fast** (install, provider, create/join, wire up) | [Quick start](/guide/getting-started) |
| **Understand turn-based vs phase-based** | [Concepts](/guide/concepts) |
| **Set up Firestore and rules** | [Firestore & rules](/guide/firestore) |
| **Handle reconnection** | [Reconnection](/guide/reconnection) |
| **Look up APIs and types** | [API Reference](/api) |

---

**Next:** [Game config](/guide/game-config) — the one object that defines your game.
