import { CHALLENGE_MAX_LEVEL, LEVEL_TIME_SECONDS, MAX_ROUND, TUTORIAL_MAX_LEVEL } from './constants';

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

const CHALLENGE_TIMER_SECONDS = 45;

const CHALLENGE_BASE = {
  undoLimit: 0,
  timerEnabled: true,
  showUndo: false,
  enforceMoveLimit: true,
  timerSeconds: CHALLENGE_TIMER_SECONDS,
  maxLevel: CHALLENGE_MAX_LEVEL,
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
  switch (clampRoundNumber(round)) {
    case 1:
      return 'tutorial';
    case 2:
      return 'challenge';
    case 3:
      return 'ice';
    case 4:
      return 'path';
    case 5:
      return 'master';
    default:
      return 'tutorial';
  }
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
    difficultyProfile: 'master',
    mechanics: { iceStops: true, requireTrailCoverage: true },
  };
}

const ROUND_NAMES = {
  en: {
    1: 'Tutorial',
    2: 'Challenge',
    3: 'Ice',
    4: 'Path',
    5: 'Master',
  },
  ko: {
    1: '튜토리얼',
    2: '챌린지',
    3: '얼음',
    4: '경로',
    5: '마스터',
  },
} as const;

export function getRoundLabel(round: number, lang: 'ko' | 'en'): string {
  const roundNumber = clampRoundNumber(round);
  const name = ROUND_NAMES[lang][roundNumber as 1 | 2 | 3 | 4 | 5];
  return lang === 'ko' ? `라운드 ${roundNumber} — ${name}` : `Round ${roundNumber} — ${name}`;
}

export function getRoundCompleteTitle(round: number): string {
  switch (clampRoundNumber(round)) {
    case 1:
      return 'Tutorial Complete!';
    case 2:
      return 'Challenge Complete!';
    case 3:
      return 'Ice Round Complete!';
    case 4:
      return 'Path Round Complete!';
    case 5:
      return 'Master Round Complete!';
    default:
      return 'Round Complete!';
  }
}

export function getRoundCompleteSubtitle(round: number): string {
  const roundNumber = clampRoundNumber(round);
  const maxLevel = getMaxLevel(roundNumber);
  const label = ROUND_NAMES.en[roundNumber as 1 | 2 | 3 | 4 | 5];
  return `You cleared all ${maxLevel} levels in Round ${roundNumber} (${label}).`;
}

export function getAdvanceRoundCtaLabel(round: number): string {
  const nextRound = getNextRound(round);
  return `Continue to Round ${nextRound}`;
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
