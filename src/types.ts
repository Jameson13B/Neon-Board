/**
 * Role in a Neon Board game.
 * - board: single source of truth; applies actions and writes state (e.g. shared screen / TV).
 * - player: client; submits actions for the board to apply (e.g. phone).
 */
export type Role = 'board' | 'player';

export type GameStatus = 'waiting' | 'active' | 'ended';

/** Stored game document in Firestore (games/{gameId}). */
export interface GameDoc {
  joinCode: string;
  state: Record<string, unknown>;
  turn: number;
  /** Turn-based: increments when we wrap to the first player. Phase-based: one full pass through phases. */
  round: number;
  phase: string;
  /** Order of player IDs for turns. If empty, turn order is not enforced. */
  turnOrder: string[];
  /** Index into turnOrder for whose turn it is. Only meaningful when turnOrder.length > 0. */
  currentPlayerIndex: number;
  /** Optional list of phases for ordered phase advancement. If set, endPhase() advances by this list. */
  phases?: string[];
  boardId: string | null;
  playerIds: string[];
  createdAt: number;
  status: GameStatus;
  /** Optional: custom metadata (e.g. game name, config). */
  meta?: Record<string, unknown>;
}

/** Pending action written by a player; board reads and applies these. */
export interface PendingActionDoc {
  type: string;
  payload: Record<string, unknown>;
  playerId: string;
  createdAt: number;
}

/**
 * Engine context: turn, round, phase, status, turn order, current player.
 * Available in reducers and on the live snapshot as snapshot.context.
 * Use for logic like "is it my turn?", "which phase?", "is game ended?".
 */
export interface GameContext {
  turn: number;
  round: number;
  phase: string;
  status: GameStatus;
  turnOrder: string[];
  currentPlayerIndex: number;
  /** Whose turn it is (turnOrder[currentPlayerIndex]). Undefined if turnOrder is empty. */
  currentPlayerId?: string;
  /** Phase list for ordered advancement, if configured. */
  phases?: string[];
}

/** Context passed to action reducers (board only). Engine context plus the player who sent the action. */
export type ActionContext = GameContext & {
  /** The player who submitted this action. */
  playerId: string;
};

/** Action definition: (state, payload) => newState. Run only on board. */
export type ActionReducer<State = Record<string, unknown>> = (
  state: State,
  payload: Record<string, unknown>,
  context: ActionContext
) => State;

/** Map of action type -> reducer. */
export type ActionMap<State = Record<string, unknown>> = Record<string, ActionReducer<State>>;

/** Config when creating a game. */
export interface CreateGameOptions {
  joinCode?: string;
  initialState?: Record<string, unknown>;
  initialPhase?: string;
  /** Phase list for ordered advancement via endPhase(). First element is used if initialPhase not set. */
  phases?: string[];
  /** Turn order (player IDs). If omitted, join order is used as turn order once players join. */
  turnOrder?: string[];
  meta?: Record<string, unknown>;
}

/** Config when joining a game. */
export interface JoinGameOptions {
  playerId?: string;
  playerDisplayName?: string;
}

/** Result of creating a game (caller is the board). */
export interface CreateGameResult {
  gameId: string;
  joinCode: string;
  role: 'board';
}

/** Result of joining a game. */
export interface JoinGameResult {
  gameId: string;
  joinCode: string;
  role: Role;
  playerId: string;
}

/** Session stored for reconnection (e.g. localStorage). */
export interface StoredSession {
  gameId: string;
  joinCode: string;
  role: Role;
  playerId: string;
  storedAt: number;
}

/**
 * Live game snapshot for consumers. Use state + context + meta for logic and UI.
 * - state: your game board data (pieces, scores, cards, etc.).
 * - context: engine state (turn, round, phase, status, turn order, current player) for rules and UI.
 * - meta: optional custom metadata.
 */
export interface GameStateSnapshot<State = Record<string, unknown>> {
  /** Game board state; writable via updateGameState. */
  state: State;
  /** Engine context for logic and UI (turn, phase, round, status, whose turn, etc.). Read-only. */
  context: GameContext;
  /** Optional custom metadata; writable via updateGameState. */
  meta?: Record<string, unknown>;
  boardId: string | null;
  playerIds: string[];
}
