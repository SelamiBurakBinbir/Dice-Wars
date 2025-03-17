export const store = {
  currentTurn: 0,
  selectedTerritory: null,
  moveCount: 0,
  fastForwardEnabled: false,
  currentDelayResolve: null,
  currentDelayTimeout: null,
  lockedTerritories: new Set(),
  skipAlert: false,
};

export const NORMAL_PHASE_TIME = 500;
export const FAST_PHASE_TIME = 50;
