jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import { getDifficultyProfile, getMaxLevel, getRoundConfig, getRoundLabel } from '../src/difficulty';
import { migrateV1ToV2, normalizeSavedProgress, type TSavedProgressV1 } from '../src/persistence';

describe('getRoundConfig', () => {
  it('returns tutorial profile for round 1', () => {
    const config = getRoundConfig(1);
    expect(config).toEqual({
      undoLimit: 5,
      timerEnabled: false,
      showUndo: true,
      enforceMoveLimit: false,
      timerSeconds: 60,
      difficultyProfile: 'tutorial',
      maxLevel: 10,
    });
  });

  it('returns challenge profile for round 2+', () => {
    const config = getRoundConfig(2);
    expect(config).toEqual({
      undoLimit: 0,
      timerEnabled: true,
      showUndo: false,
      enforceMoveLimit: true,
      timerSeconds: 45,
      difficultyProfile: 'challenge',
      maxLevel: 50,
    });
  });
});

describe('getMaxLevel', () => {
  it('returns 10 for tutorial round', () => {
    expect(getMaxLevel(1)).toBe(10);
  });

  it('returns 50 for challenge rounds', () => {
    expect(getMaxLevel(2)).toBe(50);
    expect(getMaxLevel(3)).toBe(50);
  });
});

describe('getDifficultyProfile', () => {
  it('maps round 1 to tutorial', () => {
    expect(getDifficultyProfile(1)).toBe('tutorial');
  });

  it('maps round 2+ to challenge', () => {
    expect(getDifficultyProfile(2)).toBe('challenge');
    expect(getDifficultyProfile(3)).toBe('challenge');
  });
});

describe('getRoundLabel', () => {
  it('returns tutorial label for round 1', () => {
    expect(getRoundLabel(1, 'en')).toBe('Round 1 — Tutorial');
    expect(getRoundLabel(1, 'ko')).toBe('라운드 1 — 튜토리얼');
  });

  it('returns challenge label for round 2+', () => {
    expect(getRoundLabel(2, 'en')).toBe('Round 2 — Challenge');
    expect(getRoundLabel(2, 'ko')).toBe('라운드 2 — 챌린지');
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

  it('accepts v2 saves directly', () => {
    const v2 = {
      schemaVersion: 2 as const,
      roundNumber: 2,
      roundsCompleted: 1,
      difficultyProfile: 'challenge' as const,
      screen: 'intro' as const,
      levelNumber: 1,
      levelSeeds: [42],
      gameCompleted: false,
      inLevelProgress: null,
    };

    expect(normalizeSavedProgress(v2)).toEqual(v2);
  });

  it('rejects invalid payloads', () => {
    expect(normalizeSavedProgress({ schemaVersion: 99 })).toBeNull();
    expect(normalizeSavedProgress(null)).toBeNull();
  });
});
