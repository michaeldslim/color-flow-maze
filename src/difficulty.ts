import { CHALLENGE_MAX_LEVEL, LEVEL_TIME_SECONDS, TUTORIAL_MAX_LEVEL } from './constants';

export type TDifficultyProfile = 'tutorial' | 'challenge';

export type TRoundConfig = {
  undoLimit: number;
  timerEnabled: boolean;
  showUndo: boolean;
  enforceMoveLimit: boolean;
  timerSeconds: number;
  difficultyProfile: TDifficultyProfile;
  maxLevel: number;
};

export function getMaxLevel(round: number): number {
  return round === 1 ? TUTORIAL_MAX_LEVEL : CHALLENGE_MAX_LEVEL;
}

export function getDifficultyProfile(round: number): TDifficultyProfile {
  return round === 1 ? 'tutorial' : 'challenge';
}

export function getRoundConfig(round: number): TRoundConfig {
  if (round === 1) {
    return {
      undoLimit: 5,
      timerEnabled: false,
      showUndo: true,
      enforceMoveLimit: false,
      timerSeconds: LEVEL_TIME_SECONDS,
      difficultyProfile: 'tutorial',
      maxLevel: TUTORIAL_MAX_LEVEL,
    };
  }

  return {
    undoLimit: 0,
    timerEnabled: true,
    showUndo: false,
    enforceMoveLimit: true,
    timerSeconds: 45,
    difficultyProfile: 'challenge',
    maxLevel: CHALLENGE_MAX_LEVEL,
  };
}

export function getRoundLabel(round: number, lang: 'ko' | 'en'): string {
  if (round === 1) {
    return lang === 'ko' ? '라운드 1 — 튜토리얼' : 'Round 1 — Tutorial';
  }
  return lang === 'ko' ? `라운드 ${round} — 챌린지` : `Round ${round} — Challenge`;
}
