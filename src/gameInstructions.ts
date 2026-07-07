import { colors } from './theme';

export const ROUND_NUMBER = 1;

export const gameInstructions = {
  ko: {
    title: '플레이 방법',
    roundLabel: '라운드 1 — 튜토리얼',
    items: [
      '- 방향 버튼(▲▼◀▶)을 누르세요',
      '- 벽에 부딪힐 때까지 미끄러집니다',
      '- 오렌지색 칸에 "멈춰야" 승리합니다',
      '- 이동 횟수를 초과하면 패배합니다',
      '- Undo로 최대 5번 되돌릴 수 있습니다',
      '- Reset을 길게 누르면 게임이 처음부터 다시 시작됩니다',
      '- 50레벨을 클리어하면 게임을 완료합니다',
    ],
    legendTitle: '타일 설명',
    legend: [
      { color: colors.cellStart, label: '시작 (플레이어)' },
      { color: colors.cellGoal, label: '목표 — 여기서 멈춰야 합니다' },
      { color: colors.cellWall, label: '벽 — 통과 불가' },
      { color: colors.cellTrail, label: '이동 경로' },
      { color: colors.cellIce, label: '얼음 — 특수 타일 (곧 활성화)' },
    ],
    soundOn: '켜짐',
    soundOff: '꺼짐',
    soundLabel: '효과음',
  },
  en: {
    title: 'How to play',
    roundLabel: 'Round 1 — Tutorial',
    items: [
      '- Press the arrow buttons (▲▼◀▶)',
      '- You slide until you hit a wall',
      '- You win only if you STOP on the orange tile',
      '- Running out of moves ends the level',
      '- Undo up to 5 times per level',
      '- Long-press Reset to restart the whole game',
      '- Beat Level 50 to finish the game',
    ],
    legendTitle: 'Tile legend',
    legend: [
      { color: colors.cellStart, label: 'Start (player)' },
      { color: colors.cellGoal, label: 'Goal — stop here to win' },
      { color: colors.cellWall, label: 'Wall — blocks movement' },
      { color: colors.cellTrail, label: 'Trail — path you traveled' },
      { color: colors.cellIce, label: 'Ice — special tile (mechanic coming)' },
    ],
    soundOn: 'On',
    soundOff: 'Off',
    soundLabel: 'Sound effects',
  },
};
