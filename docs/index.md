---
layout: home

hero:
  name: Neon Board
  text: Multiplayer Game Framework
  tagline: Build board games, card games, and live multiplayer experiences with Firebase — no game server required.
  image:
    src: /logo.png
    alt: Neon Board
  actions:
    - theme: brand
      text: Start with Concepts
      link: /guide/concepts
    - theme: alt
      text: Getting started
      link: /guide/getting-started

features:
  - icon: 🧠
    title: "State + actions"
    details: Define your game state and action reducers (like Flux). The board applies actions; everyone stays in sync.
  - icon: 👥
    title: "Multiplayer, realtime"
    details: One shared game in Firestore. Board and players see the same state instantly across devices.
  - icon: ⚛️
    title: "Hooks-first"
    details: React hooks for create, join, state, and actions. Use the imperative API in vanilla JS or non-React code.
  - icon: 📋
    title: "Board as source of truth"
    details: Only the board writes state and advances turn/phase. Simple rules, no conflicting writes.
---

<h2 style="text-align: center; padding-top: 3rem;">Where to go</h2>

<div style="text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; max-width: 400px; margin: 0 auto;">
  <strong style="margin-top: 1rem;"><a href="/guide/concepts">Concepts</a></strong> How Neon Board works, turn-based vs phase-based games, and how to choose.
  <strong style="margin-top: 1rem;"><a href="/guide/getting-started">Getting started</a></strong> Install, set up the provider, create/join a game, and wire up state and actions.
  <strong style="margin-top: 1rem;"><a href="/guide/firestore">Firestore & rules</a></strong> Collection layout and security rules for your Firebase project.
  <strong style="margin-top: 1rem;"><a href="/guide/reconnection">Reconnection</a></strong> Stored session and "Rejoin?" flow for returning players.
  <strong style="margin-top: 1rem;"><a href="/api">API Reference</a></strong> Hooks, imperative API, and TypeScript types.
</div>

<h2 style="text-align: center; padding-top: 3rem;">Install</h2>

<div style="text-align: center;">
   <div style="max-width:400px; margin:0 auto;">
   
   ```bash
   npm install neon-board firebase
   ```
   
   </div>
  
  <p style="margin-top: 0.75rem; font-size: 0.9rem;">Peer dependencies: <code>firebase</code> (v11+), <code>react</code> (v17+) if using hooks.</p>
</div>

<footer style="margin-top: 4rem;
  margin-bottom: 2rem;
  padding-top: 2rem;
  border-top: 1px solid #222;
  font-size: 0.875rem;
  color: #555;
  text-align: center;">
  &copy; {{ new Date().getFullYear() }} Neon Board by Atomic10 Studio
</footer>