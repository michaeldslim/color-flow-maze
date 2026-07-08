import { colors } from './theme';
import { clampRoundNumber } from './difficulty';
import i18n from './i18n';

type TLegendItem = { color: string; label: string };

const LEGEND_BASE = [
  { color: colors.cellStart, labelKey: 'legend.start' },
  { color: colors.cellGoal, labelKey: 'legend.goal' },
  { color: colors.cellWall, labelKey: 'legend.wall' },
  { color: colors.cellTrail, labelKey: 'legend.trail' },
] as const;

const ROUND_INSTRUCTION_KEYS = {
  1: 'instructions.round1',
  2: 'instructions.round2',
  3: 'instructions.round3',
  4: 'instructions.round4',
  5: 'instructions.round5',
} as const;

export function getInstructionItems(round: number): string[] {
  const roundNumber = clampRoundNumber(round) as keyof typeof ROUND_INSTRUCTION_KEYS;
  const items = i18n.t(ROUND_INSTRUCTION_KEYS[roundNumber], { returnObjects: true });
  return Array.isArray(items) ? (items as string[]) : [];
}

export function getLegendForRound(round: number): TLegendItem[] {
  const roundNumber = clampRoundNumber(round);
  const legend: TLegendItem[] = LEGEND_BASE.map((item) => ({
    color: item.color,
    label: i18n.t(item.labelKey),
  }));

  if (roundNumber === 1 || roundNumber === 2) {
    legend.push({ color: colors.cellIce, label: i18n.t('legend.icePending') });
  }
  if (roundNumber === 3 || roundNumber === 5) {
    legend.push({ color: colors.cellIce, label: i18n.t('legend.ice') });
  }
  if (roundNumber === 4 || roundNumber === 5) {
    legend.push({ color: '#FBBF24', label: i18n.t('legend.path') });
  }

  return legend;
}
