import type { ActionMap, GameDoc, ActionContext } from './types.js';
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
 * Apply a single pending action using the provided action map (board only).
 * Returns new state or null if action type unknown / reducer throws.
 */
export function applyAction(
  currentState: Record<string, unknown>,
  actionType: string,
  payload: Record<string, unknown>,
  context: ActionContext,
  actionMap: ActionMap
): Record<string, unknown> | null {
  const reducer = actionMap[actionType];
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
  actionMap: ActionMap
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
    const newState = applyAction(state, a.type, a.payload, context, actionMap);
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
