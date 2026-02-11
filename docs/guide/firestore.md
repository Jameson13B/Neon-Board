# Firestore layout and rules

Neon Board uses one Firestore collection for games and a subcollection for pending actions. This page describes the layout and how to secure it so only the board writes game state and only players in the game can submit actions.

---

## Collection layout

- **Collection:** `games`  
  Document id = game id (auto-generated when the board creates a game).

- **Game document fields:**
  - `joinCode` — Code players use to join (e.g. 6 characters).
  - `state` — Your game board data (object). Writable by the board via `updateGameState(db, gameId, { state })`.
  - `meta` — Optional custom metadata. Writable by the board via `updateGameState(db, gameId, { meta })`.
  - `turn`, `round`, `phase`, `status`, `turnOrder`, `currentPlayerIndex`, `phases` — Engine fields. Only the board changes these (via `endTurn`, `endPhase`, `setPhase`, `setTurnOrder`, `setStatus`, or when applying actions).
  - `boardId` — The player id of the board device.
  - `playerIds` — Array of player ids who have joined.
  - `createdAt` — Timestamp.
  - `status` — `'waiting' | 'active' | 'ended'`.

- **Subcollection:** `games/{gameId}/pendingActions`  
  Players add documents here (action type, payload, playerId, createdAt). The board reads them, applies each with your action map, writes the new state, then deletes the action doc.

---

## Security rules

You want:

1. **Only the board** can update the game document (state, meta, and engine fields).
2. **Anyone in the game** (board or player) can read the game document.
3. **Players in the game** can create documents in `pendingActions`.
4. **Only the board** can delete documents in `pendingActions` (after applying).

The example below uses `request.auth.uid` as the player/board id. If the board uses `getOrCreateBoardId()` (no auth), you’ll need a different way to identify the board in rules (e.g. a custom token or a separate “board” collection).

```javascript
// firestore.rules (adjust to your auth and game doc shape)
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function isBoard(gameId) {
      return get(/databases/$(database)/documents/games/$(gameId)).data.boardId == request.auth.uid;
    }
    function isInGame(gameId) {
      let game = get(/databases/$(database)/documents/games/$(gameId)).data;
      return game.boardId == request.auth.uid || request.auth.uid in game.playerIds;
    }
    match /games/{gameId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null && (resource.data.boardId == request.auth.uid || resource.data.boardId == null);
      match /pendingActions/{actionId} {
        allow read: if request.auth != null && isInGame(gameId);
        allow create: if request.auth != null && isInGame(gameId);
        allow delete: if request.auth != null && isBoard(gameId);
      }
    }
  }
}
```

Copy this into your Firebase project (e.g. `firestore.rules`) and adjust for your auth and board identification. A full example is often provided in the repo as `firestore.rules.example`.
