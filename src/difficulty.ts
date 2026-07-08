import { CHALLENGE_MAX_LEVEL, LEVEL_TIME_SECONDS, MAX_ROUND, TUTORIAL_MAX_LEVEL } from './constants';
import i18n from './i18n';

export type TDifficultyProfile = 'tutorial' | 'challenge' | 'ice' | 'path' | 'master';

export type TRoundMechanics = {
  iceStops: boolean;
  requireTrailCoverage: boolean;
};

export type TRoundConfig = {
  roundNumber: number;
  undoLimit: number;
  timerEnabled: boolean;
  showUndo: boolean;
  enforceMoveLimit: boolean;
  timerSeconds: number;
  difficultyProfile: TDifficultyProfile;
  maxLevel: number;
  mechanics: TRoundMechanics;
};

const CHALLENGE_TIMER_SECONDS = 60;
const MASTER_TIMER_SECONDS = 45;
const LEVEL_TIMER_STEP = 4;
const MIN_LEVEL_TIMER_SECONDS = 30;

const CHALLENGE_BASE = {
  undoLimit: 0,
  timerEnabled: true,
  showUndo: false,
  enforceMoveLimit: true,
  timerSeconds: CHALLENGE_TIMER_SECONDS,
  maxLevel: CHALLENGE_MAX_LEVEL,
} as const;

function getRoundNameKey(round: number): keyof typeof ROUND_NAME_KEYS {
  switch (clampRoundNumber(round)) {
    case 1:
      return 'tutorial';
    case 2:
      return 'challenge';
    case 3:
      return 'ice';
    case 4:
      return 'path';
    default:
      return 'master';
  }
}

const ROUND_NAME_KEYS = {
  tutorial: 'tutorial',
  challenge: 'challenge',
  ice: 'ice',
  path: 'path',
  master: 'master',
} as const;

const ROUND_COMPLETE_KEYS = {
  1: 'tutorial',
  2: 'challenge',
  3: 'ice',
  4: 'path',
  5: 'master',
} as const;

export function clampRoundNumber(round: number): number {
  if (!Number.isInteger(round) || round < 1) return 1;
  return Math.min(round, MAX_ROUND);
}

export function getMaxLevel(round: number): number {
  return clampRoundNumber(round) === 1 ? TUTORIAL_MAX_LEVEL : CHALLENGE_MAX_LEVEL;
}

export function getNextRound(round: number): number {
  const normalized = clampRoundNumber(round);
  if (normalized >= MAX_ROUND) return 2;
  return normalized + 1;
}

export function getDifficultyProfile(round: number): TDifficultyProfile {
  return getRoundNameKey(round);
}

export function getLevelTimerSeconds(round: number, levelNumber: number): number {
  const config = getRoundConfig(round);
  if (!config.timerEnabled) return config.timerSeconds;

  const normalizedLevel = Math.max(1, levelNumber);
  return Math.max(
    MIN_LEVEL_TIMER_SECONDS,
    config.timerSeconds - Math.floor((normalizedLevel - 1) / LEVEL_TIMER_STEP),
  );
}

export function getRoundConfig(round: number): TRoundConfig {
  const roundNumber = clampRoundNumber(round);

  if (roundNumber === 1) {
    return {
      roundNumber: 1,
      undoLimit: 5,
      timerEnabled: false,
      showUndo: true,
      enforceMoveLimit: false,
      timerSeconds: LEVEL_TIME_SECONDS,
      difficultyProfile: 'tutorial',
      maxLevel: TUTORIAL_MAX_LEVEL,
      mechanics: { iceStops: false, requireTrailCoverage: false },
    };
  }

  if (roundNumber === 2) {
    return {
      roundNumber: 2,
      ...CHALLENGE_BASE,
      difficultyProfile: 'challenge',
      mechanics: { iceStops: false, requireTrailCoverage: false },
    };
  }

  if (roundNumber === 3) {
    return {
      roundNumber: 3,
      ...CHALLENGE_BASE,
      difficultyProfile: 'ice',
      mechanics: { iceStops: true, requireTrailCoverage: false },
    };
  }

  if (roundNumber === 4) {
    return {
      roundNumber: 4,
      ...CHALLENGE_BASE,
      difficultyProfile: 'path',
      mechanics: { iceStops: false, requireTrailCoverage: true },
    };
  }

  return {
    roundNumber: 5,
    ...CHALLENGE_BASE,
    timerSeconds: MASTER_TIMER_SECONDS,
    difficultyProfile: 'master',
    mechanics: { iceStops: true, requireTrailCoverage: true },
  };
}

export function getRoundLabel(round: number): string {
  const roundNumber = clampRoundNumber(round);
  const nameKey = getRoundNameKey(roundNumber);
  return i18n.t('rounds.label', {
    n: roundNumber,
    name: i18n.t(`rounds.names.${nameKey}`),
  });
}

export function getRoundCompleteTitle(round: number): string {
  const key = ROUND_COMPLETE_KEYS[clampRoundNumber(round) as 1 | 2 | 3 | 4 | 5] ?? 'default';
  return i18n.t(`rounds.complete.${key}`);
}

export function getRoundCompleteSubtitle(round: number): string {
  const roundNumber = clampRoundNumber(round);
  const nameKey = getRoundNameKey(roundNumber);
  return i18n.t('rounds.completeSubtitle', {
    n: roundNumber,
    max: getMaxLevel(roundNumber),
    name: i18n.t(`rounds.names.${nameKey}`),
  });
}

export function getAdvanceRoundCtaLabel(round: number): string {
  const nextRound = getNextRound(round);
  return i18n.t('rounds.advanceCta', { n: nextRound });
}

export function getPlayAgainLabel(round: number): string {
  const roundNumber = clampRoundNumber(round);
  if (roundNumber === 1) return i18n.t('rounds.playAgainRound1');
  return i18n.t('rounds.playAgainRound', { n: roundNumber });
}

export function isValidDifficultyProfile(value: unknown): value is TDifficultyProfile {
  return (
    value === 'tutorial' ||
    value === 'challenge' ||
    value === 'ice' ||
    value === 'path' ||
    value === 'master'
  );
}
