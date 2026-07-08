import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import {
  getAdvanceRoundCtaLabel,
  getMaxLevel,
  getRoundCompleteSubtitle,
  getRoundCompleteTitle,
  getRoundLabel,
  clampRoundNumber,
} from '../difficulty';
import { MAX_ROUND } from '../constants';
import { gameStyles } from '../theme';

type Props = {
  visible: boolean;
  roundNumber: number;
  roundsCompleted: number;
  onAdvanceRound: () => void;
  onPlayAgain: () => void;
  onBackToIntro: () => void;
};

const RoundCompleteModal: React.FC<Props> = ({
  visible,
  roundNumber,
  roundsCompleted,
  onAdvanceRound,
  onPlayAgain,
  onBackToIntro,
}) => {
  const normalizedRound = clampRoundNumber(roundNumber);
  const maxLevel = getMaxLevel(normalizedRound);
  const isCycleComplete = normalizedRound >= MAX_ROUND;
  const title = getRoundCompleteTitle(normalizedRound);
  const subtitle = getRoundCompleteSubtitle(normalizedRound);
  const advanceLabel = getAdvanceRoundCtaLabel(normalizedRound);
  const playAgainLabel =
    normalizedRound === 1 ? 'Play Again (Round 1)' : `Play Again (Round ${normalizedRound})`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBackToIntro}>
      <View style={gameStyles.modalOverlay}>
        <View style={gameStyles.modalCard} accessibilityViewIsModal>
          <Text style={gameStyles.modalTitle}>{title}</Text>
          <Text style={gameStyles.modalSubtitle}>{subtitle}</Text>
          <Text style={gameStyles.modalRoundBadge}>{getRoundLabel(normalizedRound, 'en')}</Text>

          <View style={gameStyles.modalStatsRow}>
            <Text style={gameStyles.modalStat}>Rounds finished: {roundsCompleted}</Text>
            <Text style={gameStyles.modalStat}>Levels cleared: {maxLevel}</Text>
          </View>

          <Pressable
            onPress={onAdvanceRound}
            accessibilityRole="button"
            accessibilityLabel={advanceLabel}
            style={({ pressed }) => [gameStyles.modalPrimaryButton, pressed && gameStyles.buttonPressed]}
          >
            <Text style={gameStyles.modalPrimaryButtonText}>{advanceLabel}</Text>
          </Pressable>

          <Pressable
            onPress={onPlayAgain}
            accessibilityRole="button"
            accessibilityLabel={playAgainLabel}
            style={({ pressed }) => [gameStyles.modalSecondaryButton, pressed && gameStyles.buttonPressed]}
          >
            <Text style={gameStyles.modalSecondaryButtonText}>{playAgainLabel}</Text>
          </Pressable>

          {isCycleComplete ? (
            <Text style={gameStyles.modalCycleHint}>Full cycle complete — back to Round 2.</Text>
          ) : null}

          <Pressable
            onPress={onBackToIntro}
            accessibilityRole="button"
            accessibilityLabel="Back to main menu"
            style={({ pressed }) => [gameStyles.modalTertiaryButton, pressed && gameStyles.buttonPressed]}
          >
            <Text style={gameStyles.modalTertiaryButtonText}>Main Menu</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

export default RoundCompleteModal;
