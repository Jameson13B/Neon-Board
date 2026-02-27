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
import { useNeonGameContext, useNeonBoardContext } from './context.js';

/** Create a new game (caller becomes board). Uses getBoardId() if provided, else getCurrentUserId(). */
export function useCreateGame() {
  const { db, getCurrentUserId, getBoardId, gameConfig: contextConfig } = useNeonGameContext();
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
        const finalOptions = { ...options };
        if (!finalOptions.gameConfig && contextConfig) {
          finalOptions.gameConfig = contextConfig;
        }
        const result = await createGame(db, boardId, finalOptions);
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
    [db, getCurrentUserId, getBoardId, contextConfig]
  );

  return { createGame: create, gameId, joinCode, error, loading };
}

/** Join a game by join code. */
export function useJoinGame() {
  const { db, getCurrentUserId } = useNeonGameContext();
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
  const { db } = useNeonGameContext();
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
export function useSubmitAction(
  gameId?: string | null,
  playerId?: string | null
) {
  const { db, getCurrentUserId } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();
  const [error, setError] = useState<Error | null>(null);

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalPlayerId = playerId ?? getCurrentUserId();

  const submit = useCallback(
    async (type: string, payload?: Record<string, unknown>) => {
      if (!finalGameId || !finalPlayerId) return;
      setError(null);
      try {
        await addPendingAction(db, finalGameId, finalPlayerId, type, payload ?? {});
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    [db, finalGameId, finalPlayerId]
  );

  return { submitAction: submit, error };
}

/**
 * Board only: subscribe to pending actions and apply them with your game config.
 * Call once in the board UI; keeps state in sync with Firestore.
 * If args are omitted, tries to use NeonBoardContext and NeonGameProvider config.
 */
export function useBoardActions(
  gameId?: string | null,
  role?: 'board' | 'player' | null,
  currentState?: GameStateSnapshot | null,
  gameConfig?: GameConfig
) {
  const { db, gameConfig: contextConfig } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalRole = role ?? boardCtx?.role ?? null;
  const finalState = currentState ?? boardCtx?.snapshot ?? null;
  const config = gameConfig ?? contextConfig;
  
  const processing = useRef(false);
  const lastProcessed = useRef<string>('');

  useEffect(() => {
    if (!finalGameId || finalRole !== 'board' || !finalState) return;

    const unsub = subscribeToPendingActions(db, finalGameId, async (actions) => {
      if (actions.length === 0 || processing.current) return;
      if (!config) {
        console.warn('Neon: Missing gameConfig in useBoardActions. Actions will not be processed.');
        return;
      }

      const key = actions.map((a) => a.id).join(',');
      if (key === lastProcessed.current) return;

      processing.current = true;
      try {
        const ctx = finalState.context;
        await processPendingActions(
          db,
          finalGameId,
          {
            state: finalState.state,
            turn: ctx.turn,
            round: ctx.round,
            phase: ctx.phase,
            status: ctx.status,
            turnOrder: ctx.turnOrder,
            currentPlayerIndex: ctx.currentPlayerIndex,
            phases: ctx.phases,
          },
          actions,
          config
        );
        lastProcessed.current = key;
      } finally {
        processing.current = false;
      }
    });

    return () => unsub();
  }, [db, finalGameId, finalRole, finalState?.state, finalState?.context, config]);
}

/**
 * Board only: advance to the next turn (next player, increment turn).
 * Pass gameConfig to run turns.onEnd / turns.onBegin hooks.
 * If args are omitted, tries to use NeonBoardContext and NeonGameProvider config.
 */
export function useEndTurn(
  gameId?: string | null,
  role?: 'board' | 'player' | null,
  currentState?: GameStateSnapshot | null,
  gameConfig?: GameConfig
) {
  const { db, gameConfig: contextConfig } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalRole = role ?? boardCtx?.role ?? null;
  const finalState = currentState ?? boardCtx?.snapshot ?? null;
  const config = gameConfig ?? contextConfig;

  return useCallback(async () => {
    if (!finalGameId || finalRole !== 'board' || !finalState) return;
    await endTurn(db, finalGameId, finalState, config);
  }, [db, finalGameId, finalRole, finalState, config]);
}

/**
 * Board only: advance to the next phase. Pass gameConfig to run phase onEnd/onBegin hooks.
 * Call with optional nextPhase to jump to a specific phase, or omit to use the configured phases list.
 * If args are omitted, tries to use NeonBoardContext and NeonGameProvider config.
 */
export function useEndPhase(
  gameId?: string | null,
  role?: 'board' | 'player' | null,
  currentState?: GameStateSnapshot | null,
  gameConfig?: GameConfig
) {
  const { db, gameConfig: contextConfig } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalRole = role ?? boardCtx?.role ?? null;
  const finalState = currentState ?? boardCtx?.snapshot ?? null;
  const config = gameConfig ?? contextConfig;

  return useCallback(
    async (nextPhase?: string) => {
      if (!finalGameId || finalRole !== 'board' || !finalState) return;
      await endPhase(db, finalGameId, finalState, nextPhase, config);
    },
    [db, finalGameId, finalRole, finalState, config]
  );
}

/**
 * Board only: set phase to a specific value (custom phase flow).
 */
export function useSetPhase(
  gameId?: string | null,
  role?: 'board' | 'player' | null
) {
  const { db } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalRole = role ?? boardCtx?.role ?? null;

  return useCallback(
    async (phase: string) => {
      if (!finalGameId || finalRole !== 'board') return;
      await setPhase(db, finalGameId, phase);
    },
    [db, finalGameId, finalRole]
  );
}

/**
 * Board only: set turn order to a list of player IDs (customize or reshuffle).
 */
export function useSetTurnOrder(
  gameId?: string | null,
  role?: 'board' | 'player' | null
) {
  const { db } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalRole = role ?? boardCtx?.role ?? null;

  return useCallback(
    async (turnOrder: string[]) => {
      if (!finalGameId || finalRole !== 'board') return;
      await setTurnOrder(db, finalGameId, turnOrder);
    },
    [db, finalGameId, finalRole]
  );
}

/**
 * Board only: set game status (e.g. 'ended' to end the game).
 */
export function useSetStatus(
  gameId?: string | null,
  role?: 'board' | 'player' | null
) {
  const { db } = useNeonGameContext();
  const boardCtx = useNeonBoardContext();

  const finalGameId = gameId ?? boardCtx?.gameId ?? null;
  const finalRole = role ?? boardCtx?.role ?? null;

  return useCallback(
    async (status: GameStatus) => {
      if (!finalGameId || finalRole !== 'board') return;
      await setStatus(db, finalGameId, status);
    },
    [db, finalGameId, finalRole]
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

/**
 * Composite hook for "Everything you need" in a game component.
 * Must be used within NeonBoardProvider.
 * Returns game state and all helper functions.
 */
export function useNeonBoard() {
  const ctx = useNeonBoardContext();
  if (!ctx) throw new Error("useNeonBoard must be used within NeonBoardProvider");

  const { gameId, role, snapshot } = ctx;

  const endTurn = useEndTurn();
  const endPhase = useEndPhase();
  const setPhase = useSetPhase();
  const setTurnOrder = useSetTurnOrder();
  const setStatus = useSetStatus();
  const { submitAction } = useSubmitAction();

  return {
    gameId,
    role,
    snapshot,
    endTurn,
    endPhase,
    setPhase,
    setTurnOrder,
    setStatus,
    submitAction,
  };
}
