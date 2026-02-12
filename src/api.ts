import type { Firestore } from 'firebase/firestore';
import {
  createGameInFirestore,
  findGameByJoinCode,
  joinGameInFirestore,
  subscribeToGame,
  subscribeToPendingActions,
  addPendingAction,
  updateGameState,
  mergeGameDoc,
} from './firestore.js';
import type {
  CreateGameOptions,
  JoinGameOptions,
  CreateGameResult,
  JoinGameResult,
  GameStateSnapshot,
  GameStatus,
  GameConfig,
  ActionContext,
  SetupContext,
} from './types.js';
import { saveSession, loadSession, clearSession } from './reconnect.js';
import {
  processPendingActions,
  getNextTurnUpdates,
  getNextPhaseUpdates,
  getInitialPhaseFromConfig,
  getPhaseOrderFromConfig,
  runPhaseTransitionHooks,
  runTurnHooks,
} from './state.js';

/** Build action context for lifecycle hooks (playerId empty for system). */
function toActionContext(
  snapshot: Pick<GameStateSnapshot, 'context'>,
  playerId: string
): ActionContext {
  const ctx = snapshot.context;
  const currentPlayerId =
    ctx.turnOrder.length > 0
      ? ctx.turnOrder[ctx.currentPlayerIndex % ctx.turnOrder.length]
      : undefined;
  return {
    playerId,
    turn: ctx.turn,
    round: ctx.round,
    phase: ctx.phase,
    status: ctx.status ?? 'active',
    turnOrder: ctx.turnOrder,
    currentPlayerIndex: ctx.currentPlayerIndex,
    currentPlayerId,
    phases: ctx.phases,
  };
}

/**
 * Create a new game. Current user becomes the board.
 * If options.gameConfig is set, phases and initialPhase are derived from config (phase with start: true, then next chain).
 * If gameConfig.setup is set, it is called to produce initial state; otherwise options.initialState is used.
 */
export async function createGame(
  db: Firestore,
  boardId: string,
  options?: CreateGameOptions
): Promise<CreateGameResult> {
  const config = options?.gameConfig;
  let phases: string[] | undefined;
  let initialPhase: string | undefined;
  let initialState: Record<string, unknown> | undefined = options?.initialState;

  if (config) {
    phases = getPhaseOrderFromConfig(config);
    initialPhase = getInitialPhaseFromConfig(config);
    if (config.setup) {
      const setupContext: SetupContext = {
        phase: initialPhase ?? '',
        turn: 0,
        round: 0,
        status: 'waiting',
        turnOrder: options?.turnOrder ?? [],
        currentPlayerIndex: 0,
      };
      initialState = config.setup(setupContext) as Record<string, unknown>;
    }
  } else {
    phases = options?.phases;
    initialPhase = options?.initialPhase ?? (phases && phases.length > 0 ? phases[0] : undefined);
  }

  const { gameId, joinCode } = await createGameInFirestore(db, {
    joinCode: options?.joinCode,
    initialState,
    initialPhase,
    phases,
    turnOrder: options?.turnOrder,
    meta: options?.meta,
    boardId,
  });
  saveSession({ gameId, joinCode, role: 'board', playerId: boardId, storedAt: Date.now() });
  return { gameId, joinCode, role: 'board' };
}

/**
 * Join a game by join code. Returns gameId, role (board if first joiner and no board yet), and playerId.
 */
export async function joinGame(
  db: Firestore,
  joinCode: string,
  playerId: string,
  options?: JoinGameOptions
): Promise<JoinGameResult> {
  const found = await findGameByJoinCode(db, joinCode);
  if (!found) throw new Error('Game not found');
  const role = await joinGameInFirestore(db, found.gameId, playerId);
  saveSession({
    gameId: found.gameId,
    joinCode: found.doc.joinCode,
    role,
    playerId,
    storedAt: Date.now(),
  });
  return {
    gameId: found.gameId,
    joinCode: found.doc.joinCode,
    role,
    playerId,
  };
}

/**
 * Restore session from storage (e.g. on app load). Returns null if none or expired.
 */
export function getStoredSession(): JoinGameResult | null {
  const s = loadSession();
  if (!s) return null;
  return {
    gameId: s.gameId,
    joinCode: s.joinCode,
    role: s.role,
    playerId: s.playerId,
  };
}

/**
 * Clear stored session (e.g. on leave game / logout).
 */
export function leaveGame(): void {
  clearSession();
}

/**
 * Advance to the next turn (next player in turn order, increment turn).
 * Board only. If gameConfig is provided and has turns.onEnd/onBegin, those hooks run.
 * Pass full snapshot (state + context) when using hooks.
 */
export async function endTurn(
  db: Firestore,
  gameId: string,
  current: Pick<GameStateSnapshot, 'state' | 'context'>,
  gameConfig?: GameConfig
): Promise<void> {
  const ctx = current.context;
  const doc = {
    turn: ctx.turn,
    round: ctx.round,
    phase: ctx.phase,
    status: ctx.status,
    turnOrder: ctx.turnOrder,
    currentPlayerIndex: ctx.currentPlayerIndex,
    phases: ctx.phases,
    state: current.state ?? {},
  };
  const updates = getNextTurnUpdates(doc);
  let state = current.state ?? {};
  if (gameConfig?.turns && (gameConfig.turns.onEnd || gameConfig.turns.onBegin)) {
    const currentCtx = toActionContext(current, '');
    const nextIndex =
      doc.turnOrder.length > 0 ? (doc.currentPlayerIndex + 1) % doc.turnOrder.length : 0;
    const nextContext: ActionContext = {
      ...currentCtx,
      turn: doc.turn + 1,
      currentPlayerIndex: nextIndex,
      currentPlayerId:
        doc.turnOrder.length > 0 ? doc.turnOrder[nextIndex] : undefined,
      round: nextIndex === 0 ? doc.round + 1 : doc.round,
    };
    state = runTurnHooks(gameConfig, state, currentCtx, nextContext);
  }
  await mergeGameDoc(db, gameId, { ...updates, state });
}

/**
 * Advance to the next phase. If nextPhase is provided, jump to that phase;
 * otherwise advance by the game's phases list (if configured).
 * Board only. If gameConfig is provided, phase onEnd/onBegin hooks run for the transition.
 */
export async function endPhase(
  db: Firestore,
  gameId: string,
  current: Pick<GameStateSnapshot, 'state' | 'context'>,
  nextPhase?: string,
  gameConfig?: GameConfig
): Promise<void> {
  const ctx = current.context;
  const doc = {
    turn: 0,
    round: ctx.round,
    phase: ctx.phase,
    status: ctx.status,
    turnOrder: ctx.turnOrder,
    currentPlayerIndex: ctx.currentPlayerIndex,
    phases: ctx.phases,
    state: {},
  };
  const updates = getNextPhaseUpdates(doc, nextPhase);
  if (!updates) return;
  let state = current.state ?? {};
  const nextPhaseName = updates.phase ?? nextPhase;
  if (gameConfig?.phases && nextPhaseName) {
    state = runPhaseTransitionHooks(
      gameConfig,
      ctx.phase,
      nextPhaseName,
      state,
      toActionContext(current, '')
    );
  }
  await mergeGameDoc(db, gameId, { ...updates, state });
}

/**
 * Set phase to a specific value (board only). Use for custom phase flow.
 */
export async function setPhase(
  db: Firestore,
  gameId: string,
  phase: string
): Promise<void> {
  await mergeGameDoc(db, gameId, { phase });
}

/**
 * Set turn order to a specific list of player IDs (board only). Use to customize or reshuffle order.
 */
export async function setTurnOrder(
  db: Firestore,
  gameId: string,
  turnOrder: string[]
): Promise<void> {
  await mergeGameDoc(db, gameId, {
    turnOrder,
    currentPlayerIndex: 0,
  });
}

/**
 * Set game status (board only). Use e.g. setStatus(db, gameId, 'ended') to end a game.
 */
export async function setStatus(
  db: Firestore,
  gameId: string,
  status: GameStatus
): Promise<void> {
  await mergeGameDoc(db, gameId, { status });
}

export {
  subscribeToGame,
  subscribeToPendingActions,
  addPendingAction,
  updateGameState,
  processPendingActions,
};

export type { GameConfig, GameStateSnapshot } from './types.js';
