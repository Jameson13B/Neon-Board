import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Firestore } from 'firebase/firestore';
import type { GameConfig, GameStateSnapshot, Role } from './types.js';

// --- Root Context (Framework) ---

export interface NeonGameContextValue {
  db: Firestore;
  getCurrentUserId: () => string | null;
  getBoardId: (() => string | null) | undefined;
  gameConfig?: GameConfig<any>;
}

const NeonGameContext = createContext<NeonGameContextValue | null>(null);

export interface NeonGameProviderProps {
  db: Firestore;
  /** Required for players (join). For board-only devices can return null if using getBoardId. */
  getCurrentUserId: () => string | null;
  /** Optional. When set, used as board id when creating a game (no user auth needed for board). */
  getBoardId?: () => string | null;
  /** Optional. Global game configuration. Shared by all hooks. */
  gameConfig?: GameConfig<any>;
  children: ReactNode;
}

export function NeonGameProvider({ db, getCurrentUserId, getBoardId, gameConfig, children }: NeonGameProviderProps) {
  const value = useMemo(() => ({ db, getCurrentUserId, getBoardId, gameConfig }), [db, getCurrentUserId, getBoardId, gameConfig]);
  return (
    <NeonGameContext.Provider value={value}>
      {children}
    </NeonGameContext.Provider>
  );
}

export function useNeonGameContext(): NeonGameContextValue {
  const ctx = useContext(NeonGameContext);
  if (!ctx) throw new Error('Neon Game hooks must be used within NeonGameProvider');
  return ctx;
}

// --- Inner Context (Active Session) ---

export interface NeonBoardContextValue {
  gameId: string;
  role: Role;
  snapshot: GameStateSnapshot | null;
}

export const NeonBoardContext = createContext<NeonBoardContextValue | null>(null);

export function useNeonBoardContext() {
  return useContext(NeonBoardContext);
}
