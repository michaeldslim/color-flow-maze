import AsyncStorage from '@react-native-async-storage/async-storage';
import { type TPosition, type TGameStatus } from '../gameLogic';

export type TScreen = 'intro' | 'game';

export type TSavedInLevelProgress = {
  position: TPosition;
  movesUsed: number;
  status: TGameStatus;
  undosUsed: number;
  secondsLeft: number;
  trail: boolean[][];
};

export type TSavedProgress = {
  schemaVersion: number;
  screen: TScreen;
  levelNumber: number;
  levelSeeds: number[];
  gameCompleted: boolean;
  inLevelProgress?: TSavedInLevelProgress | null;
};

export const PROGRESS_STORAGE_KEY = 'color-flow-maze:progress:v1';
export const PROGRESS_SCHEMA_VERSION = 1;

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

function isValidSavedProgress(value: unknown): value is TSavedProgress {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TSavedProgress>;

  if (candidate.schemaVersion !== PROGRESS_SCHEMA_VERSION) return false;
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

export async function loadSavedProgress(): Promise<TSavedProgress | null> {
  try {
    const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidSavedProgress(parsed)) return null;
    return parsed;
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
