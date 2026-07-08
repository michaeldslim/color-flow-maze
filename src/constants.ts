// Centralized configuration constants used across the app
export const TUTORIAL_MAX_LEVEL = 10;
export const CHALLENGE_MAX_LEVEL = 50;
/** @deprecated Use getMaxLevel(round) from difficulty.ts */
export const MAX_LEVEL = CHALLENGE_MAX_LEVEL;
export const UNDO_LIMIT = 5;
export const LEVEL_TIME_SECONDS = 60;
export const TIMER_ENABLED = true;

// Export other app-level constants here as needed in future

export default {
  TUTORIAL_MAX_LEVEL,
  CHALLENGE_MAX_LEVEL,
  MAX_LEVEL,
  UNDO_LIMIT,
  LEVEL_TIME_SECONDS,
  TIMER_ENABLED,
};
