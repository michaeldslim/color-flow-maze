import { colors } from './theme';
import { clampRoundNumber } from './difficulty';

type TLegendItem = { color: string; label: string };

const baseLegend = {
  ko: [
    { color: colors.cellStart, label: '시작 (플레이어)' },
    { color: colors.cellGoal, label: '목표 — 여기서 멈춰야 합니다' },
    { color: colors.cellWall, label: '벽 — 통과 불가' },
    { color: colors.cellTrail, label: '이동 경로' },
  ],
  en: [
    { color: colors.cellStart, label: 'Start (player)' },
    { color: colors.cellGoal, label: 'Goal — stop here to win' },
    { color: colors.cellWall, label: 'Wall — blocks movement' },
    { color: colors.cellTrail, label: 'Trail — path you traveled' },
  ],
} as const;

const iceLegend = {
  ko: { color: colors.cellIce, label: '얼음 — 여기서 멈춥니다' },
  en: { color: colors.cellIce, label: 'Ice — you stop on this tile' },
} as const;

const pathLegend = {
  ko: { color: '#FBBF24', label: '필수 경로 — 반드시 칠해야 합니다' },
  en: { color: '#FBBF24', label: 'Required path — must be painted' },
} as const;

const pendingIceLegend = {
  ko: { color: colors.cellIce, label: '얼음 — 특수 타일 (곧 활성화)' },
  en: { color: colors.cellIce, label: 'Ice — special tile (mechanic coming)' },
} as const;

export const gameInstructions = {
  ko: {
    title: '플레이 방법',
    items: {
      1: [
        '- 방향 버튼(▲▼◀▶)을 누르세요',
        '- 벽에 부딪힐 때까지 미끄러집니다',
        '- 오렌지색 칸에 "멈춰야" 승리합니다',
        '- 제한 시간 없이 편하게 연습하세요',
        '- 설정에서 이동 횟수 제한을 켤 수 있습니다',
        '- Undo로 최대 5번 되돌릴 수 있습니다',
        '- 10레벨을 클리어하면 라운드 2가 열립니다',
      ],
      2: [
        '- 제한 시간 45초, 이동 횟수 제한 적용',
        '- Undo 없음 — 신중하게 이동하세요',
        '- 50레벨을 클리어하면 라운드 3(얼음)이 열립니다',
        '- Reset 길게 누르기 → 라운드 1부터 다시 시작',
      ],
      3: [
        '- 라운드 2 규칙 + 얼음(❄) 타일에서 멈춥니다',
        '- 얼음 없는 지름길은 넘어가 버릴 수 있습니다',
        '- 50레벨 클리어 → 라운드 4(경로 강제)',
      ],
      4: [
        '- 라운드 2 규칙 + 금색 필수 경로를 모두 칠해야 승리',
        '- 목표에 도달해도 필수 칸을 놓치면 클리어 불가',
        '- 50레벨 클리어 → 라운드 5(마스터)',
      ],
      5: [
        '- 얼음 멈춤 + 필수 경로 규칙이 동시에 적용됩니다',
        '- 가장 어려운 라운드입니다',
        '- 50레벨 클리어 → 라운드 2(챌린지)로 돌아갑니다',
      ],
    },
    legendTitle: '타일 설명',
    soundOn: '켜짐',
    soundOff: '꺼짐',
    soundLabel: '효과음',
    moveLimitOn: '켜짐',
    moveLimitOff: '꺼짐',
    moveLimitLabel: '이동 횟수 제한',
  },
  en: {
    title: 'How to play',
    items: {
      1: [
        '- Press the arrow buttons (▲▼◀▶)',
        '- You slide until you hit a wall',
        '- You win only if you STOP on the orange tile',
        '- No time limit — learn at your own pace',
        '- Optional: enable move limit in settings below',
        '- Undo up to 5 times per level',
        '- Beat Level 10 to unlock Round 2',
      ],
      2: [
        '- 45-second timer and move limit enforced',
        '- No undo — plan your moves carefully',
        '- Beat Level 50 to unlock Round 3 (Ice)',
        '- Long-press Reset to restart from Round 1',
      ],
      3: [
        '- Round 2 rules + you stop on ice (❄) tiles',
        '- Shortcuts without ice may cause overshoot',
        '- Beat Level 50 to unlock Round 4 (Path)',
      ],
      4: [
        '- Round 2 rules + paint all required (gold) path cells',
        '- Reaching the goal is not enough if required cells are missed',
        '- Beat Level 50 to unlock Round 5 (Master)',
      ],
      5: [
        '- Ice stops and required path rules combined',
        '- The hardest round in the cycle',
        '- Beat Level 50 to return to Round 2',
      ],
    },
    legendTitle: 'Tile legend',
    soundOn: 'On',
    soundOff: 'Off',
    soundLabel: 'Sound effects',
    moveLimitOn: 'On',
    moveLimitOff: 'Off',
    moveLimitLabel: 'Move limit',
  },
};

export function getInstructionItems(lang: 'ko' | 'en', round: number): string[] {
  const roundNumber = clampRoundNumber(round) as 1 | 2 | 3 | 4 | 5;
  return gameInstructions[lang].items[roundNumber];
}

export function getLegendForRound(lang: 'ko' | 'en', round: number): TLegendItem[] {
  const roundNumber = clampRoundNumber(round);
  const legend: TLegendItem[] = [...baseLegend[lang]];

  if (roundNumber === 1 || roundNumber === 2) {
    legend.push({ ...pendingIceLegend[lang] });
  }
  if (roundNumber === 3 || roundNumber === 5) {
    legend.push({ ...iceLegend[lang] });
  }
  if (roundNumber === 4 || roundNumber === 5) {
    legend.push({ ...pathLegend[lang] });
  }

  return legend;
}
