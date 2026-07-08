import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { getMaxLevel } from '../difficulty';
import { gameStyles } from '../theme';

type Props = {
  visible: boolean;
  roundNumber: number;
  roundsCompleted: number;
  onStartChallenge: () => void;
  onPlayAgainTutorial: () => void;
  onPlayAgainChallenge: () => void;
  onBackToIntro: () => void;
};

const RoundCompleteModal: React.FC<Props> = ({
  visible,
  roundNumber,
  roundsCompleted,
  onStartChallenge,
  onPlayAgainTutorial,
  onPlayAgainChallenge,
  onBackToIntro,
}) => {
  const isTutorialComplete = roundNumber === 1;
  const maxLevel = getMaxLevel(roundNumber);
  const title = isTutorialComplete ? 'Tutorial Complete!' : 'Challenge Complete!';
  const subtitle = isTutorialComplete
    ? `You cleared all ${maxLevel} tutorial levels.`
    : `You conquered Round ${roundNumber} — all ${maxLevel} levels.`;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onBackToIntro}>
      <View style={gameStyles.modalOverlay}>
        <View style={gameStyles.modalCard} accessibilityViewIsModal>
          <Text style={gameStyles.modalTitle}>{title}</Text>
          <Text style={gameStyles.modalSubtitle}>{subtitle}</Text>

          <View style={gameStyles.modalStatsRow}>
            <Text style={gameStyles.modalStat}>Rounds finished: {roundsCompleted}</Text>
          </View>

          {isTutorialComplete ? (
            <Pressable
              onPress={onStartChallenge}
              accessibilityRole="button"
              accessibilityLabel="Start Challenge Round"
              style={({ pressed }) => [
                gameStyles.modalPrimaryButton,
                pressed && gameStyles.buttonPressed,
              ]}
            >
              <Text style={gameStyles.modalPrimaryButtonText}>Start Challenge Round</Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={isTutorialComplete ? onPlayAgainTutorial : onPlayAgainChallenge}
            accessibilityRole="button"
            accessibilityLabel={isTutorialComplete ? 'Play Round 1 again' : 'Play challenge again'}
            style={({ pressed }) => [
              gameStyles.modalSecondaryButton,
              !isTutorialComplete && gameStyles.modalPrimaryButton,
              pressed && gameStyles.buttonPressed,
            ]}
          >
            <Text
              style={[
                gameStyles.modalSecondaryButtonText,
                !isTutorialComplete && gameStyles.modalPrimaryButtonText,
              ]}
            >
              {isTutorialComplete ? 'Play Again (Round 1)' : 'Play Again'}
            </Text>
          </Pressable>

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
