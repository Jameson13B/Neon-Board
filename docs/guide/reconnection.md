---
prev: { text: 'Firestore & rules', link: '/guide/firestore' }
next: { text: 'API Reference', link: '/api/' }
---

# Reconnection

When a user creates or joins a game, Neon Board stores a **session** in `localStorage` (key: `neon-board-session`). The session is valid for **7 days**. That lets you show a “Rejoin?” option when they open the app again — no need to re-enter the join code.

---

## How it works

- **Create game** — The board’s session (gameId, joinCode, role, playerId, storedAt) is saved.
- **Join game** — The player’s session is saved the same way.
- **Rejoin** — Call **`joinGame(storedSession.joinCode)`** (or the imperative **`joinGame(db, session.joinCode, session.playerId)`**). That re-establishes the session and returns the same game. You can then navigate to the game view.

**Leaving:** Call **`leaveGame()`** (or **`useLeaveGame()`**) when the user explicitly leaves the game so the stored session is cleared.

---

## Example: “Rejoin?” banner

```jsx
import { useStoredSession, useJoinGame } from 'neon-board';

function RejoinBanner() {
  const session = useStoredSession();
  const { joinGame, loading } = useJoinGame();

  if (!session) return null;

  const handleRejoin = () => {
    joinGame(session.joinCode);
    // Then navigate to game view (e.g. after joinGame resolves)
  };

  return (
    <button onClick={handleRejoin} disabled={loading}>
      Rejoin game {session.joinCode}?
    </button>
  );
}
```

Show this on your home or lobby screen when **`useStoredSession()`** returns a session. After **`joinGame(session.joinCode)`** succeeds, redirect the user to the game (same as after a normal join).
