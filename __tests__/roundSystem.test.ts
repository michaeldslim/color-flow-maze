jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { initI18nForTests } from '../src/i18n';
import {
  clampRoundNumber,
  getAdvanceRoundCtaLabel,
  getDifficultyProfile,
  getMaxLevel,
  getNextRound,
  getRoundConfig,
  getRoundLabel,
} from '../src/difficulty';
import {
  migrateV1ToV2,
  normalizeSavedProgress,
  repairSavedProgress,
  type TSavedProgressV1,
} from '../src/persistence';

beforeAll(async () => {
  await initI18nForTests('en');
});

describe('getRoundConfig', () => {
  it('returns tutorial profile for round 1', () => {
    expect(getRoundConfig(1)).toEqual({
      roundNumber: 1,
      undoLimit: 5,
      timerEnabled: false,
      showUndo: true,
      enforceMoveLimit: false,
      timerSeconds: 60,
      difficultyProfile: 'tutorial',
      maxLevel: 10,
      mechanics: { iceStops: false, requireTrailCoverage: false },
    });
  });

  it('returns challenge profile for round 2', () => {
    expect(getRoundConfig(2)).toEqual({
      roundNumber: 2,
      undoLimit: 0,
      timerEnabled: true,
      showUndo: false,
      enforceMoveLimit: true,
      timerSeconds: 45,
      difficultyProfile: 'challenge',
      maxLevel: 50,
      mechanics: { iceStops: false, requireTrailCoverage: false },
    });
  });

  it('returns ice profile for round 3', () => {
    expect(getRoundConfig(3).difficultyProfile).toBe('ice');
    expect(getRoundConfig(3).mechanics).toEqual({ iceStops: true, requireTrailCoverage: false });
  });

  it('returns path profile for round 4', () => {
    expect(getRoundConfig(4).difficultyProfile).toBe('path');
    expect(getRoundConfig(4).mechanics).toEqual({ iceStops: false, requireTrailCoverage: true });
  });

  it('returns master profile for round 5', () => {
    expect(getRoundConfig(5).difficultyProfile).toBe('master');
    expect(getRoundConfig(5).mechanics).toEqual({ iceStops: true, requireTrailCoverage: true });
  });
});

describe('round cycle helpers', () => {
  it('getNextRound cycles 5 back to 2', () => {
    expect(getNextRound(1)).toBe(2);
    expect(getNextRound(4)).toBe(5);
    expect(getNextRound(5)).toBe(2);
  });

  it('clampRoundNumber caps invalid values', () => {
    expect(clampRoundNumber(0)).toBe(1);
    expect(clampRoundNumber(99)).toBe(5);
  });

  it('getAdvanceRoundCtaLabel reflects cycle', () => {
    expect(getAdvanceRoundCtaLabel(1)).toBe('Continue to Round 2');
    expect(getAdvanceRoundCtaLabel(5)).toBe('Continue to Round 2');
  });
});

describe('getMaxLevel', () => {
  it('returns 10 for tutorial round', () => {
    expect(getMaxLevel(1)).toBe(10);
  });

  it('returns 50 for challenge rounds', () => {
    expect(getMaxLevel(2)).toBe(50);
    expect(getMaxLevel(5)).toBe(50);
  });
});

describe('getDifficultyProfile', () => {
  it('maps each round to its profile', () => {
    expect(getDifficultyProfile(1)).toBe('tutorial');
    expect(getDifficultyProfile(2)).toBe('challenge');
    expect(getDifficultyProfile(3)).toBe('ice');
    expect(getDifficultyProfile(4)).toBe('path');
    expect(getDifficultyProfile(5)).toBe('master');
  });
});

describe('getRoundLabel', () => {
  it('returns distinct labels per round in English', () => {
    expect(getRoundLabel(1)).toBe('Round 1 — Tutorial');
    expect(getRoundLabel(3)).toBe('Round 3 — Ice');
  });

  it('returns Korean labels when language is ko', async () => {
    await initI18nForTests('ko');
    expect(getRoundLabel(5)).toBe('라운드 5 — 마스터');
    await initI18nForTests('en');
  });
});

describe('persistence migration', () => {
  const baseV1: TSavedProgressV1 = {
    schemaVersion: 1,
    screen: 'game',
    levelNumber: 12,
    levelSeeds: [111, 222, 333, 444, 555, 666, 777, 888, 999, 1000, 1001, 1002],
    gameCompleted: false,
    inLevelProgress: null,
  };

  it('migrates v1 saves to v2 with tutorial defaults', () => {
    expect(migrateV1ToV2(baseV1)).toEqual({
      schemaVersion: 2,
      roundNumber: 1,
      roundsCompleted: 0,
      difficultyProfile: 'tutorial',
      screen: 'game',
      levelNumber: 12,
      levelSeeds: baseV1.levelSeeds,
      gameCompleted: false,
      inLevelProgress: null,
    });
  });

  it('sets roundsCompleted when v1 save was already completed', () => {
    const migrated = migrateV1ToV2({ ...baseV1, gameCompleted: true, levelNumber: 50 });
    expect(migrated.roundsCompleted).toBe(1);
    expect(migrated.roundNumber).toBe(1);
  });

  it('accepts v2 saves with extended difficulty profiles', () => {
    const v2 = {
      schemaVersion: 2 as const,
      roundNumber: 3,
      roundsCompleted: 2,
      difficultyProfile: 'ice' as const,
      screen: 'intro' as const,
      levelNumber: 1,
      levelSeeds: [42],
      gameCompleted: false,
      inLevelProgress: null,
    };

    expect(normalizeSavedProgress(v2)).toEqual(v2);
  });

  it('repairs round numbers above MAX_ROUND', () => {
    const repaired = repairSavedProgress({
      schemaVersion: 2,
      roundNumber: 9,
      roundsCompleted: 3,
      difficultyProfile: 'challenge',
      screen: 'intro',
      levelNumber: 1,
      levelSeeds: [1],
      gameCompleted: false,
      inLevelProgress: null,
    });

    expect(repaired.roundNumber).toBe(5);
    expect(repaired.difficultyProfile).toBe('master');
  });

  it('rejects invalid payloads', () => {
    expect(normalizeSavedProgress({ schemaVersion: 99 })).toBeNull();
    expect(normalizeSavedProgress(null)).toBeNull();
  });
});
