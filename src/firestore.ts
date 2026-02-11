import {
  Firestore,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  limit,
  writeBatch,
} from "firebase/firestore"
import type { Unsubscribe } from "firebase/firestore"
import {
  FIRESTORE_COLLECTION_GAMES,
  FIRESTORE_COLLECTION_PENDING_ACTIONS,
  DEFAULT_PHASE,
} from "./constants.js"
import type {
  GameDoc,
  PendingActionDoc,
  GameStateSnapshot,
  Role,
} from "./types.js"
import { generateJoinCode } from "./code.js"

export function gameRef(db: Firestore, gameId: string) {
  return doc(db, FIRESTORE_COLLECTION_GAMES, gameId)
}

export function pendingActionsRef(db: Firestore, gameId: string) {
  return collection(
    db,
    FIRESTORE_COLLECTION_GAMES,
    gameId,
    FIRESTORE_COLLECTION_PENDING_ACTIONS,
  )
}

/**
 * Create a new game. Caller becomes the board (single source of truth).
 */
export async function createGameInFirestore(
  db: Firestore,
  options: {
    joinCode?: string
    initialState?: Record<string, unknown>
    initialPhase?: string
    phases?: string[]
    turnOrder?: string[]
    meta?: Record<string, unknown>
    boardId: string
  },
): Promise<{ gameId: string; joinCode: string }> {
  const joinCode = options.joinCode ?? generateJoinCode()
  const gameRef_ = doc(collection(db, FIRESTORE_COLLECTION_GAMES))
  const gameId = gameRef_.id
  const phases = options.phases ?? []
  const initialPhase =
    options.initialPhase ?? (phases.length > 0 ? phases[0] : DEFAULT_PHASE)

  const gameDoc: GameDoc = {
    joinCode: joinCode.toUpperCase(),
    state: options.initialState ?? {},
    turn: 0,
    round: 0,
    phase: initialPhase,
    turnOrder: options.turnOrder ?? [],
    currentPlayerIndex: 0,
    phases: phases.length > 0 ? phases : undefined,
    boardId: options.boardId,
    playerIds: [],
    createdAt: Date.now(),
    status: "waiting",
    meta: options.meta,
  }

  await setDoc(gameRef_, gameDoc)
  return { gameId, joinCode: gameDoc.joinCode }
}

/**
 * Find game by join code (exact match, case-insensitive).
 */
export async function findGameByJoinCode(
  db: Firestore,
  joinCode: string,
): Promise<{ gameId: string; doc: GameDoc } | null> {
  const gamesRef = collection(db, FIRESTORE_COLLECTION_GAMES)
  const normalized = joinCode.trim().toUpperCase()
  const snapshot = await getDocs(gamesRef)
  for (const d of snapshot.docs) {
    const data = d.data() as GameDoc
    if (data.joinCode === normalized) {
      return { gameId: d.id, doc: data }
    }
  }
  return null
}

/**
 * Join an existing game. If no boardId is set, first joiner becomes board; otherwise joiner is player.
 */
export async function joinGameInFirestore(
  db: Firestore,
  gameId: string,
  playerId: string,
  options?: { asBoard?: boolean },
): Promise<Role> {
  const ref = gameRef(db, gameId)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error("Game not found")

  const data = snap.data() as GameDoc
  if (data.status !== "waiting" && data.status !== "active")
    throw new Error("Game is not joinable")

  const alreadyIn =
    data.playerIds.includes(playerId) || data.boardId === playerId
  if (alreadyIn) return data.boardId === playerId ? "board" : "player"

  const isBoard = options?.asBoard ?? !data.boardId
  const updates: Partial<GameDoc> = {
    playerIds: [...data.playerIds, playerId],
    status: "active",
  }
  if (isBoard) updates.boardId = playerId

  // If turn order is not set, append join order so turn order = join order
  const turnOrder = data.turnOrder ?? []
  if (!turnOrder.includes(playerId)) {
    updates.turnOrder = [...turnOrder, playerId]
  }

  await setDoc(ref, updates, { merge: true })
  return isBoard ? "board" : "player"
}

/**
 * Subscribe to game document (state, turn, phase, etc.).
 */
export function subscribeToGame(
  db: Firestore,
  gameId: string,
  onUpdate: (snapshot: GameStateSnapshot) => void,
): Unsubscribe {
  const ref = gameRef(db, gameId)
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      const emptyContext = {
        turn: 0,
        round: 0,
        phase: "",
        status: "ended" as const,
        turnOrder: [] as string[],
        currentPlayerIndex: 0,
      }
      onUpdate({
        state: {},
        context: emptyContext,
        boardId: null,
        playerIds: [],
      })
      return
    }
    const d = snap.data() as GameDoc
    const turnOrder = d.turnOrder ?? []
    const currentPlayerIndex = d.currentPlayerIndex ?? 0
    const currentPlayerId =
      turnOrder.length > 0 ? turnOrder[currentPlayerIndex % turnOrder.length] : undefined
    const context = {
      turn: d.turn,
      round: d.round ?? 0,
      phase: d.phase,
      status: d.status,
      turnOrder,
      currentPlayerIndex,
      currentPlayerId,
      phases: d.phases,
    }
    onUpdate({
      state: d.state,
      context,
      meta: d.meta,
      boardId: d.boardId,
      playerIds: d.playerIds ?? [],
    })
  })
}

/**
 * Write a pending action (player submits; board will apply).
 */
export async function addPendingAction(
  db: Firestore,
  gameId: string,
  playerId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<string> {
  const col = pendingActionsRef(db, gameId)
  const docRef = await addDoc(col, {
    type,
    payload: payload ?? {},
    playerId,
    createdAt: Date.now(),
  } as PendingActionDoc)
  return docRef.id
}

/**
 * Subscribe to pending actions (board only). Orders by createdAt.
 */
export function subscribeToPendingActions(
  db: Firestore,
  gameId: string,
  onActions: (actions: Array<{ id: string } & PendingActionDoc>) => void,
): Unsubscribe {
  const col = pendingActionsRef(db, gameId)
  const q = query(col, orderBy("createdAt", "asc"), limit(100))
  return onSnapshot(q, (snap) => {
    const actions = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as PendingActionDoc),
    }))
    onActions(actions)
  })
}

/**
 * Update game state (board only). Only state and meta are writable by clients/board.
 * To change turn, round, phase, status, or turn order use the engine APIs: endTurn, endPhase, setPhase, setTurnOrder, etc.
 */
export async function updateGameState(
  db: Firestore,
  gameId: string,
  updates: Partial<Pick<GameDoc, "state" | "meta">>,
): Promise<void> {
  const ref = gameRef(db, gameId)
  await setDoc(ref, updates, { merge: true })
}

/**
 * Internal: merge engine + state updates (used by processPendingActions and endTurn/endPhase/setPhase/setTurnOrder).
 * Not part of public API; clients must use updateGameState(state/meta) or engine APIs.
 */
export async function mergeGameDoc(
  db: Firestore,
  gameId: string,
  updates: Partial<
    Pick<
      GameDoc,
      "state" | "meta" | "turn" | "round" | "phase" | "status" | "turnOrder" | "currentPlayerIndex" | "phases"
    >
  >,
): Promise<void> {
  const ref = gameRef(db, gameId)
  await setDoc(ref, updates, { merge: true })
}

/**
 * Delete a pending action (after board has applied it).
 */
export async function deletePendingAction(
  db: Firestore,
  gameId: string,
  actionId: string,
): Promise<void> {
  const ref = doc(
    db,
    FIRESTORE_COLLECTION_GAMES,
    gameId,
    FIRESTORE_COLLECTION_PENDING_ACTIONS,
    actionId,
  )
  const batch = writeBatch(db)
  batch.delete(ref)
  await batch.commit()
}
