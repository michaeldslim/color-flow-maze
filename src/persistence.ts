import AsyncStorage from '@react-native-async-storage/async-storage';
import { type TPosition, type TGameStatus } from '../gameLogic';
import { getDifficultyProfile, isValidDifficultyProfile, clampRoundNumber, type TDifficultyProfile } from './difficulty';

export type TScreen = 'intro' | 'game';

export type TSavedInLevelProgress = {
  position: TPosition;
  movesUsed: number;
  status: TGameStatus;
  undosUsed: number;
  secondsLeft: number;
  trail: boolean[][];
};

export type TSavedProgressV1 = {
  schemaVersion: 1;
  screen: TScreen;
  levelNumber: number;
  levelSeeds: number[];
  gameCompleted: boolean;
  inLevelProgress?: TSavedInLevelProgress | null;
};

export type TSavedProgress = {
  schemaVersion: 2;
  roundNumber: number;
  roundsCompleted: number;
  difficultyProfile: TDifficultyProfile;
  screen: TScreen;
  levelNumber: number;
  levelSeeds: number[];
  gameCompleted: boolean;
  inLevelProgress?: TSavedInLevelProgress | null;
};

export const PROGRESS_STORAGE_KEY = 'color-flow-maze:progress:v1';
export const PROGRESS_SCHEMA_VERSION = 2;

function isValidSavedInLevelProgress(value: unknown): value is TSavedInLevelProgress {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TSavedInLevelProgress>;
  const pos = candidate.position as Partial<TPosition> | undefined;

  if (!pos || typeof pos.row !== 'number' || !Number.isInteger(pos.row)) return false;
  if (typeof pos.col !== 'number' || !Number.isInteger(pos.col)) return false;
  if (typeof candidate.movesUsed !== 'number' || !Number.isInteger(candidate.movesUsed)) return false;
  if (
    candidate.status !== 'playing' &&
    candidate.status !== 'won' &&
    candidate.status !== 'lost'
  ) {
    return false;
  }
  if (typeof candidate.undosUsed !== 'number' || !Number.isInteger(candidate.undosUsed)) return false;
  if (typeof candidate.secondsLeft !== 'number' || !Number.isInteger(candidate.secondsLeft)) return false;
  if (!Array.isArray(candidate.trail)) return false;
  if (
    candidate.trail.some(
      (row) => !Array.isArray(row) || row.some((cell) => typeof cell !== 'boolean'),
    )
  ) {
    return false;
  }

  return true;
}

function isValidSavedProgressV1(value: unknown): value is TSavedProgressV1 {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TSavedProgressV1>;

  if (candidate.schemaVersion !== 1) return false;
  if (candidate.screen !== 'intro' && candidate.screen !== 'game') return false;
  if (typeof candidate.levelNumber !== 'number' || !Number.isInteger(candidate.levelNumber)) return false;
  if (!Array.isArray(candidate.levelSeeds) || candidate.levelSeeds.length < candidate.levelNumber) return false;
  if (candidate.levelSeeds.some((seed) => typeof seed !== 'number' || !Number.isInteger(seed))) return false;
  if (typeof candidate.gameCompleted !== 'boolean') return false;
  if (
    candidate.inLevelProgress !== undefined &&
    candidate.inLevelProgress !== null &&
    !isValidSavedInLevelProgress(candidate.inLevelProgress)
  ) {
    return false;
  }

  return true;
}

function isValidSavedProgress(value: unknown): value is TSavedProgress {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TSavedProgress>;

  if (candidate.schemaVersion !== PROGRESS_SCHEMA_VERSION) return false;
  if (typeof candidate.roundNumber !== 'number' || !Number.isInteger(candidate.roundNumber) || candidate.roundNumber < 1) {
    return false;
  }
  if (typeof candidate.roundsCompleted !== 'number' || !Number.isInteger(candidate.roundsCompleted) || candidate.roundsCompleted < 0) {
    return false;
  }
  if (!isValidDifficultyProfile(candidate.difficultyProfile)) return false;
  if (candidate.screen !== 'intro' && candidate.screen !== 'game') return false;
  if (typeof candidate.levelNumber !== 'number' || !Number.isInteger(candidate.levelNumber)) return false;
  if (!Array.isArray(candidate.levelSeeds) || candidate.levelSeeds.length < candidate.levelNumber) return false;
  if (candidate.levelSeeds.some((seed) => typeof seed !== 'number' || !Number.isInteger(seed))) return false;
  if (typeof candidate.gameCompleted !== 'boolean') return false;
  if (
    candidate.inLevelProgress !== undefined &&
    candidate.inLevelProgress !== null &&
    !isValidSavedInLevelProgress(candidate.inLevelProgress)
  ) {
    return false;
  }

  return true;
}

export function migrateV1ToV2(saved: TSavedProgressV1): TSavedProgress {
  return {
    schemaVersion: 2,
    roundNumber: 1,
    roundsCompleted: saved.gameCompleted ? 1 : 0,
    difficultyProfile: 'tutorial',
    screen: saved.screen,
    levelNumber: saved.levelNumber,
    levelSeeds: saved.levelSeeds,
    gameCompleted: saved.gameCompleted,
    inLevelProgress: saved.inLevelProgress,
  };
}

export function repairSavedProgress(saved: TSavedProgress): TSavedProgress {
  const roundNumber = clampRoundNumber(saved.roundNumber);
  return {
    ...saved,
    roundNumber,
    difficultyProfile: getDifficultyProfile(roundNumber),
  };
}

export function normalizeSavedProgress(value: unknown): TSavedProgress | null {
  if (isValidSavedProgress(value)) return repairSavedProgress(value);
  if (isValidSavedProgressV1(value)) return repairSavedProgress(migrateV1ToV2(value));
  return null;
}

export async function loadSavedProgress(): Promise<TSavedProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return normalizeSavedProgress(parsed);
  } catch {
    return null;
  }
}

export async function saveSavedProgress(payload: TSavedProgress): Promise<void> {
  try {
    await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // swallow write errors (best-effort)
  }
}

export async function clearSavedProgress(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PROGRESS_STORAGE_KEY);
  } catch {
    // ignore
  }
}
