import { useState, useCallback, useEffect, useRef } from 'react';
import {
  createGame,
  joinGame,
  getStoredSession,
  leaveGame,
  subscribeToGame,
  subscribeToPendingActions,
  addPendingAction,
  processPendingActions,
  endTurn,
  endPhase,
  setPhase,
  setTurnOrder,
  setStatus,
} from './api.js';
import type {
  GameStateSnapshot,
  GameConfig,
  CreateGameOptions,
  JoinGameOptions,
  GameStatus,
} from './types.js';
import { useNeonBoardContext } from './context.js';

/** Create a new game (caller becomes board). Uses getBoardId() if provided, else getCurrentUserId(). */
export function useCreateGame() {
  const { db, getCurrentUserId, getBoardId } = useNeonBoardContext();
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const create = useCallback(
    async (options?: CreateGameOptions) => {
      const boardId = getBoardId?.() ?? getCurrentUserId();
      if (!boardId) {
        setError(new Error('Board identity required: provide getBoardId or getCurrentUserId'));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await createGame(db, boardId, options);
        setGameId(result.gameId);
        setJoinCode(result.joinCode);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [db, getCurrentUserId, getBoardId]
  );

  return { createGame: create, gameId, joinCode, error, loading };
}

/** Join a game by join code. */
export function useJoinGame() {
  const { db, getCurrentUserId } = useNeonBoardContext();
  const [gameId, setGameId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState<string | null>(null);
  const [role, setRole] = useState<'board' | 'player' | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);

  const join = useCallback(
    async (code: string, options?: JoinGameOptions) => {
      const uid = getCurrentUserId();
      if (!uid) {
        setError(new Error('Not authenticated'));
        return null;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await joinGame(db, code, uid, options);
        setGameId(result.gameId);
        setJoinCode(result.joinCode);
        setRole(result.role);
        setPlayerId(result.playerId);
        return result;
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        setError(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [db, getCurrentUserId]
  );

  return { joinGame: join, gameId, joinCode, role, playerId, error, loading };
}

/** Subscribe to live game state. */
export function useGameState(gameId: string | null) {
  const { db } = useNeonBoardContext();
  const [snapshot, setSnapshot] = useState<GameStateSnapshot | null>(null);

  useEffect(() => {
    if (!gameId) {
      setSnapshot(null);
      return;
    }
    const unsub = subscribeToGame(db, gameId, setSnapshot);
    return () => unsub();
  }, [db, gameId]);

  return snapshot;
}

/** Submit an action (players). Board ignores this and uses useBoardActions instead. */
export function useSubmitAction(gameId: string | null, playerId: string | null) {
  const { db } = useNeonBoardContext();
  const [error, setError] = useState<Error | null>(null);

  const submit = useCallback(
    async (type: string, payload?: Record<string, unknown>) => {
      if (!gameId || !playerId) return;
      setError(null);
      try {
        await addPendingAction(db, gameId, playerId, type, payload ?? {});
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    [db, gameId, playerId]
  );

  return { submitAction: submit, error };
}

/**
 * Board only: subscribe to pending actions and apply them with your game config.
 * Call once in the board UI; keeps state in sync with Firestore.
 */
export function useBoardActions(
  gameId: string | null,
  role: 'board' | 'player' | null,
  currentState: GameStateSnapshot | null,
  gameConfig: GameConfig
) {
  const { db } = useNeonBoardContext();
  const processing = useRef(false);
  const lastProcessed = useRef<string>('');

  useEffect(() => {
    if (!gameId || role !== 'board' || !currentState) return;

    const unsub = subscribeToPendingActions(db, gameId, async (actions) => {
      if (actions.length === 0 || processing.current) return;
      const key = actions.map((a) => a.id).join(',');
      if (key === lastProcessed.current) return;

      processing.current = true;
      try {
        const ctx = currentState.context;
        await processPendingActions(
          db,
          gameId,
          {
            state: currentState.state,
            turn: ctx.turn,
            round: ctx.round,
            phase: ctx.phase,
            status: ctx.status,
            turnOrder: ctx.turnOrder,
            currentPlayerIndex: ctx.currentPlayerIndex,
            phases: ctx.phases,
          },
          actions,
          gameConfig
        );
        lastProcessed.current = key;
      } finally {
        processing.current = false;
      }
    });

    return () => unsub();
  }, [db, gameId, role, currentState?.state, currentState?.context, gameConfig]);
}

/**
 * Board only: advance to the next turn (next player, increment turn).
 * Pass gameConfig to run turns.onEnd / turns.onBegin hooks.
 */
export function useEndTurn(
  gameId: string | null,
  role: 'board' | 'player' | null,
  currentState: GameStateSnapshot | null,
  gameConfig?: GameConfig
) {
  const { db } = useNeonBoardContext();
  return useCallback(async () => {
    if (!gameId || role !== 'board' || !currentState) return;
    await endTurn(db, gameId, currentState, gameConfig);
  }, [db, gameId, role, currentState, gameConfig]);
}

/**
 * Board only: advance to the next phase. Pass gameConfig to run phase onEnd/onBegin hooks.
 * Call with optional nextPhase to jump to a specific phase, or omit to use the configured phases list.
 */
export function useEndPhase(
  gameId: string | null,
  role: 'board' | 'player' | null,
  currentState: GameStateSnapshot | null,
  gameConfig?: GameConfig
) {
  const { db } = useNeonBoardContext();
  return useCallback(
    async (nextPhase?: string) => {
      if (!gameId || role !== 'board' || !currentState) return;
      await endPhase(db, gameId, currentState, nextPhase, gameConfig);
    },
    [db, gameId, role, currentState, gameConfig]
  );
}

/**
 * Board only: set phase to a specific value (custom phase flow).
 */
export function useSetPhase(
  gameId: string | null,
  role: 'board' | 'player' | null
) {
  const { db } = useNeonBoardContext();
  return useCallback(
    async (phase: string) => {
      if (!gameId || role !== 'board') return;
      await setPhase(db, gameId, phase);
    },
    [db, gameId, role]
  );
}

/**
 * Board only: set turn order to a list of player IDs (customize or reshuffle).
 */
export function useSetTurnOrder(
  gameId: string | null,
  role: 'board' | 'player' | null
) {
  const { db } = useNeonBoardContext();
  return useCallback(
    async (turnOrder: string[]) => {
      if (!gameId || role !== 'board') return;
      await setTurnOrder(db, gameId, turnOrder);
    },
    [db, gameId, role]
  );
}

/**
 * Board only: set game status (e.g. 'ended' to end the game).
 */
export function useSetStatus(
  gameId: string | null,
  role: 'board' | 'player' | null
) {
  const { db } = useNeonBoardContext();
  return useCallback(
    async (status: GameStatus) => {
      if (!gameId || role !== 'board') return;
      await setStatus(db, gameId, status);
    },
    [db, gameId, role]
  );
}

/** Restore session on mount; useful for "Rejoin?" UI. */
export function useStoredSession() {
  const [session, setSession] = useState<ReturnType<typeof getStoredSession>>(null);

  useEffect(() => {
    setSession(getStoredSession());
  }, []);

  return session;
}

/** Leave current game and clear stored session. */
export function useLeaveGame() {
  return useCallback(() => leaveGame(), []);
}
