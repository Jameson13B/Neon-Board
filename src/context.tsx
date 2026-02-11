import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { Firestore } from 'firebase/firestore';

export interface NeonBoardContextValue {
  db: Firestore;
  getCurrentUserId: () => string | null;
  getBoardId: (() => string | null) | undefined;
}

const NeonBoardContext = createContext<NeonBoardContextValue | null>(null);

export interface NeonBoardProviderProps {
  db: Firestore;
  /** Required for players (join). For board-only devices can return null if using getBoardId. */
  getCurrentUserId: () => string | null;
  /** Optional. When set, used as board id when creating a game (no user auth needed for board). */
  getBoardId?: () => string | null;
  children: ReactNode;
}

export function NeonBoardProvider({ db, getCurrentUserId, getBoardId, children }: NeonBoardProviderProps) {
  const value = useMemo(() => ({ db, getCurrentUserId, getBoardId }), [db, getCurrentUserId, getBoardId]);
  return (
    <NeonBoardContext.Provider value={value}>
      {children}
    </NeonBoardContext.Provider>
  );
}

export function useNeonBoardContext(): NeonBoardContextValue {
  const ctx = useContext(NeonBoardContext);
  if (!ctx) throw new Error('Neon Board hooks must be used within NeonBoardProvider');
  return ctx;
}
