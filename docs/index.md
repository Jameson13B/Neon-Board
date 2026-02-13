---
layout: home

hero:
  name: Neon Board
  text: Multiplayer Game Framework
  tagline: One game config. Board applies it. Players submit actions. Firebase Firestore — no game server.
  image:
    src: /logo.png
    alt: Neon Board
  actions:
    - theme: brand
      text: Start here
      link: /guide/start-here
    - theme: alt
      text: Game config
      link: /guide/game-config

features:
  - icon: 📋
    title: "One game config"
    details: "Define phases, moves (global + per-phase), setup, and lifecycle hooks in one object. Same config for create and for the board."
  - icon: 👥
    title: "Board + players"
    details: "One device is the source of truth; others join and submit actions. Everyone sees the same state in real time."
  - icon: ⚛️
    title: "Hooks-first"
    details: "React hooks for create, join, state, and actions. Imperative API for vanilla JS or when you need it."
  - icon: 🔄
    title: "Lifecycle hooks"
    details: "setup() at create; phase onBegin/onEnd; turn onEnd/onBegin. All driven by your config."
---

## Doc flow

- **[Start here](/guide/start-here)** — What you need in four bullets. Links to Game config and Quick start.
- **[Game config](/guide/game-config)** — The one object: setup, moves, turns, phases (start, next, onBegin, onEnd, moves).
- **[Quick start](/guide/getting-started)** — Install, provider, create/join, wire board and players.
- **[Concepts](/guide/concepts)** — Turn-based vs phase-based, terminology (optional).
- **[Firestore & rules](/guide/firestore)** — Collections and security rules.
- **[Reconnection](/guide/reconnection)** — Stored session and rejoin flow.
- **[API Reference](/api/)** — Hooks, imperative API, types (GameConfig, PhaseConfig, etc.).

## Install

```bash
npm install neon-board firebase
```

Peer deps: `firebase` (v11+), `react` (v17+) if using hooks.

---

<footer style="margin-top: 4rem; margin-bottom: 2rem; padding-top: 2rem; border-top: 1px solid var(--vp-c-divider); font-size: 0.875rem; color: var(--vp-c-text-2); text-align: center;">
  © Neon Board by <a href="https://www.atomic10.studio" target="_blank" rel="noopener noreferrer">Atomic10 Studio</a>
</footer>
