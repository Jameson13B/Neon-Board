/**
 * Neon Board — multiplayer game framework with Firebase Firestore
 * Board + clients or clients-only; hooks-first API.
 */

export { NeonGameProvider, useNeonGameContext, NeonBoardContext, useNeonBoardContext } from './context.js';
export type { NeonGameProviderProps, NeonGameContextValue, NeonBoardContextValue } from './context.js';

export { NeonBoardProvider } from './BoardProvider.js';
export type { NeonBoardProviderProps } from './BoardProvider.js';

export {
  useCreateGame,
  useJoinGame,
  useGameState,
  useSubmitAction,
  useBoardActions,
  useEndTurn,
  useEndPhase,
  useSetPhase,
  useSetTurnOrder,
  useSetStatus,
  useStoredSession,
  useLeaveGame,
  useNeonBoard,
} from './hooks.js';

export {
  createGame,
  joinGame,
  getStoredSession,
  leaveGame,
  subscribeToGame,
  subscribeToPendingActions,
  addPendingAction,
  updateGameState,
  processPendingActions,
  endTurn,
  endPhase,
  setPhase,
  setTurnOrder,
  setStatus,
} from './api.js';
export { getOrCreateBoardId } from './reconnect.js';
export type { GetOrCreateBoardIdOptions } from './reconnect.js';

export type {
  Role,
  GameStatus,
  GameDoc,
  GameContext,
  PendingActionDoc,
  ActionReducer,
  ActionContext,
  SetupContext,
  TurnConfig,
  GameConfig,
  PhaseConfig,
  CreateGameOptions,
  JoinGameOptions,
  CreateGameResult,
  JoinGameResult,
  StoredSession,
  GameStateSnapshot,
} from './types.js';
export type { GameDocTurnPhase } from './state.js';
export {
  getNextTurnUpdates,
  getNextPhaseUpdates,
  getAllowedMoveTypes,
  getInitialPhaseFromConfig,
  getPhaseOrderFromConfig,
} from './state.js';
