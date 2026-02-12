import type { GameConfig, GameDoc, ActionContext, ActionReducer } from './types.js';
import type { Firestore } from 'firebase/firestore';
import { mergeGameDoc, deletePendingAction } from './firestore.js';

/** Doc shape required for turn/phase and action processing. */
export type GameDocTurnPhase = Pick<
  GameDoc,
  'state' | 'turn' | 'round' | 'phase' | 'status' | 'turnOrder' | 'currentPlayerIndex' | 'phases'
>;

function toActionContext(
  playerId: string,
  doc: GameDocTurnPhase
): ActionContext {
  const { turn, round, phase, status, turnOrder, currentPlayerIndex, phases } = doc;
  const currentPlayerId =
    turnOrder.length > 0 ? turnOrder[currentPlayerIndex % turnOrder.length] : undefined;
  return {
    playerId,
    turn,
    round,
    phase,
    status: status ?? 'active',
    turnOrder,
    currentPlayerIndex,
    currentPlayerId,
    phases,
  };
}

/**
 * Derive the initial phase from config: the phase with start: true, or the first phase key.
 */
export function getInitialPhaseFromConfig(config: GameConfig): string {
  const phases = config.phases;
  if (!phases || Object.keys(phases).length === 0) return '';
  const withStart = Object.entries(phases).find(([, p]) => p.start === true);
  if (withStart) return withStart[0];
  return Object.keys(phases)[0];
}

/**
 * Derive ordered phase list from config: start from initial phase, follow next until no next or cycle.
 */
export function getPhaseOrderFromConfig(config: GameConfig): string[] {
  const phases = config.phases;
  if (!phases || Object.keys(phases).length === 0) return [];
  const order: string[] = [];
  let current = getInitialPhaseFromConfig(config);
  const seen = new Set<string>();
  while (current && !seen.has(current)) {
    seen.add(current);
    order.push(current);
    const next = phases[current]?.next;
    current = next && phases[next] ? next : '';
  }
  return order;
}

/**
 * Allowed move types for a phase: top-level moves ∪ phases[phase].moves (object keys).
 */
export function getAllowedMoveTypes(config: GameConfig, phase: string): Set<string> {
  const set = new Set<string>(Object.keys(config.moves ?? {}));
  const phaseMoves = config.phases?.[phase]?.moves;
  if (phaseMoves && typeof phaseMoves === 'object') {
    Object.keys(phaseMoves).forEach((m) => set.add(m));
  }
  return set;
}

/**
 * Get the reducer for an action type in a given phase (global moves or phase moves).
 */
function getReducer(
  config: GameConfig,
  phase: string,
  actionType: string
): ActionReducer | undefined {
  const global = config.moves?.[actionType];
  if (global) return global;
  return config.phases?.[phase]?.moves?.[actionType];
}

/**
 * Apply a single pending action using the game config (board only).
 * Rejects if action type is not allowed in the current phase (engine validation).
 * Returns new state or null if not allowed / unknown / reducer throws.
 */
export function applyAction(
  currentState: Record<string, unknown>,
  actionType: string,
  payload: Record<string, unknown>,
  context: ActionContext,
  gameConfig: GameConfig
): Record<string, unknown> | null {
  const allowed = getAllowedMoveTypes(gameConfig, context.phase);
  if (!allowed.has(actionType)) return null;
  const reducer = getReducer(gameConfig, context.phase, actionType);
  if (!reducer || typeof reducer !== 'function') return null;
  try {
    return reducer(currentState, payload, context) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Process pending actions one-by-one, update Firestore state once with final state.
 * Call this when the board receives new pending actions (e.g. in a subscription).
 */
export async function processPendingActions(
  db: Firestore,
  gameId: string,
  currentDoc: GameDocTurnPhase,
  actions: Array<{ id: string; type: string; payload: Record<string, unknown>; playerId: string; createdAt: number }>,
  gameConfig: GameConfig
): Promise<void> {
  let state = { ...currentDoc.state };
  const turn = currentDoc.turn;
  const round = currentDoc.round;
  const phase = currentDoc.phase;
  const status = currentDoc.status;
  const turnOrder = currentDoc.turnOrder;
  const currentPlayerIndex = currentDoc.currentPlayerIndex;
  const phases = currentDoc.phases;

  for (const a of actions) {
    const context = toActionContext(a.playerId, {
      state,
      turn,
      round,
      phase,
      status,
      turnOrder,
      currentPlayerIndex,
      phases,
    });
    const newState = applyAction(state, a.type, a.payload, context, gameConfig);
    if (newState != null) {
      state = newState;
      await deletePendingAction(db, gameId, a.id);
    }
  }

  await mergeGameDoc(db, gameId, {
    state,
    turn,
    round,
    phase,
    turnOrder,
    currentPlayerIndex,
    phases,
  });
}

/**
 * Compute updates to advance to the next turn (next player in turn order, increment turn).
 * Round increments when we wrap from last player back to first (turn-based).
 * The engine does not auto-advance; the board calls endTurn() when a turn should end.
 * Use getNextTurnUpdates with mergeGameDoc only for custom engine logic.
 */
export function getNextTurnUpdates(
  doc: GameDocTurnPhase
): Partial<Pick<GameDoc, 'turn' | 'round' | 'currentPlayerIndex'>> {
  const order = doc.turnOrder;
  if (order.length === 0) {
    return { turn: doc.turn + 1 };
  }
  const nextIndex = (doc.currentPlayerIndex + 1) % order.length;
  const wrappedToFirst = nextIndex === 0;
  return {
    turn: doc.turn + 1,
    currentPlayerIndex: nextIndex,
    ...(wrappedToFirst ? { round: doc.round + 1 } : {}),
  };
}

/**
 * Compute updates to advance to the next phase.
 * If nextPhase is provided, use it; otherwise advance by phases list if configured.
 * Round increments when we wrap from last phase back to first (phase-based).
 * The engine does not auto-advance; the board calls endPhase() when a phase should end.
 * Use getNextPhaseUpdates with mergeGameDoc only for custom engine logic.
 */
export function getNextPhaseUpdates(
  doc: GameDocTurnPhase,
  nextPhase?: string
): Partial<Pick<GameDoc, 'phase' | 'round'>> | null {
  if (nextPhase !== undefined && nextPhase !== '') {
    return { phase: nextPhase };
  }
  const phases = doc.phases;
  if (!phases || phases.length === 0) return null;
  const i = phases.indexOf(doc.phase);
  const nextIndex = i < 0 ? 0 : (i + 1) % phases.length;
  const wrappedToFirst = nextIndex === 0;
  return {
    phase: phases[nextIndex],
    ...(wrappedToFirst ? { round: doc.round + 1 } : {}),
  };
}

const emptyPayload: Record<string, unknown> = {};

/**
 * Run phase transition hooks: currentPhase.onEnd then nextPhase.onBegin.
 * Returns the final state after both hooks. Uses empty payload; context.phase updated for onBegin.
 */
export function runPhaseTransitionHooks(
  config: GameConfig,
  currentPhaseName: string,
  nextPhaseName: string,
  state: Record<string, unknown>,
  context: ActionContext
): Record<string, unknown> {
  let s = state;
  const currentPhase = config.phases?.[currentPhaseName];
  if (currentPhase?.onEnd && typeof currentPhase.onEnd === 'function') {
    try {
      s = currentPhase.onEnd(s, emptyPayload, context) as Record<string, unknown>;
    } catch {
      // keep state on hook error
    }
  }
  const nextContext: ActionContext = { ...context, phase: nextPhaseName };
  const nextPhase = config.phases?.[nextPhaseName];
  if (nextPhase?.onBegin && typeof nextPhase.onBegin === 'function') {
    try {
      s = nextPhase.onBegin(s, emptyPayload, nextContext) as Record<string, unknown>;
    } catch {
      // keep state on hook error
    }
  }
  return s;
}

/**
 * Run turn lifecycle hooks: turns.onEnd (current turn) then turns.onBegin (next turn).
 * Pass state and current context for onEnd; for onBegin pass context with updated turn/currentPlayerIndex.
 * Returns the final state after both hooks.
 */
export function runTurnHooks(
  config: GameConfig,
  state: Record<string, unknown>,
  currentContext: ActionContext,
  nextContext: ActionContext
): Record<string, unknown> {
  let s = state;
  const turns = config.turns;
  if (!turns) return s;
  if (turns.onEnd && typeof turns.onEnd === 'function') {
    try {
      s = turns.onEnd(s, emptyPayload, currentContext) as Record<string, unknown>;
    } catch {
      // keep state on hook error
    }
  }
  if (turns.onBegin && typeof turns.onBegin === 'function') {
    try {
      s = turns.onBegin(s, emptyPayload, nextContext) as Record<string, unknown>;
    } catch {
      // keep state on hook error
    }
  }
  return s;
}
