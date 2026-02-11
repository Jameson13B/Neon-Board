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
} from './types.js';
import { saveSession, loadSession, clearSession } from './reconnect.js';
import {
  processPendingActions,
  getNextTurnUpdates,
  getNextPhaseUpdates,
} from './state.js';
import type { ActionMap } from './types.js';

/**
 * Create a new game. Current user becomes the board.
 */
export async function createGame(
  db: Firestore,
  boardId: string,
  options?: CreateGameOptions
): Promise<CreateGameResult> {
  const { gameId, joinCode } = await createGameInFirestore(db, {
    joinCode: options?.joinCode,
    initialState: options?.initialState,
    initialPhase: options?.initialPhase,
    phases: options?.phases,
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
 * Board only. Pass current game snapshot from useGameState so the engine can compute the next state.
 */
export async function endTurn(
  db: Firestore,
  gameId: string,
  current: Pick<GameStateSnapshot, 'context'>
): Promise<void> {
  const ctx = current.context;
  const updates = getNextTurnUpdates({
    turn: ctx.turn,
    round: ctx.round,
    phase: ctx.phase,
    status: ctx.status,
    turnOrder: ctx.turnOrder,
    currentPlayerIndex: ctx.currentPlayerIndex,
    phases: ctx.phases,
    state: {},
  });
  await mergeGameDoc(db, gameId, updates);
}

/**
 * Advance to the next phase. If nextPhase is provided, jump to that phase;
 * otherwise advance by the game's phases list (if configured).
 * Board only.
 */
export async function endPhase(
  db: Firestore,
  gameId: string,
  current: Pick<GameStateSnapshot, 'context'>,
  nextPhase?: string
): Promise<void> {
  const ctx = current.context;
  const updates = getNextPhaseUpdates(
    {
      turn: 0,
      round: ctx.round,
      phase: ctx.phase,
      status: ctx.status,
      turnOrder: ctx.turnOrder,
      currentPlayerIndex: ctx.currentPlayerIndex,
      phases: ctx.phases,
      state: {},
    },
    nextPhase
  );
  if (updates) await mergeGameDoc(db, gameId, updates);
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

export type { ActionMap, GameStateSnapshot } from './types.js';
