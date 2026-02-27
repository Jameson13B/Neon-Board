import { type ReactNode, useMemo } from 'react';
import { useGameState, useBoardActions } from './hooks.js';
import { NeonBoardContext } from './context.js';
import type { Role } from './types.js';

export interface NeonBoardProviderProps {
  gameId: string;
  role?: Role;
  children: ReactNode;
}

/**
 * Provides active game state to children. Wraps useGameState to make hooks simpler.
 * Place this inside NeonGameProvider.
 * Automatically processes actions if role is 'board'.
 */
export function NeonBoardProvider({ gameId, role = 'player', children }: NeonBoardProviderProps) {
  const snapshot = useGameState(gameId);

  // Automatically process actions if we are the board
  // We pass explicit args here because the context isn't set yet (we are providing it!)
  useBoardActions(gameId, role, snapshot);

  const value = useMemo(() => ({
    gameId,
    role,
    snapshot
  }), [gameId, role, snapshot]);

  return (
    <NeonBoardContext.Provider value={value}>
      {children}
    </NeonBoardContext.Provider>
  );
}
