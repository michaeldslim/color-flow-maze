import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TDirection } from '../../gameLogic';
import { gameStyles } from '../theme';

type Props = {
  attemptMove: (dir: TDirection) => void;
  status: string;
  undo: () => void;
  undoDisabled: boolean;
  undoCountRemaining: number;
  showUndo: boolean;
  handleResetPress: () => void;
  handleResetLongPress: () => void;
  showResetHintInline: boolean;
  onNextLevel: () => void;
  nextDisabled: boolean;
  nextLabel: string;
  nextHighlighted?: boolean;
};

const DIRECTION_LABELS: Record<TDirection, string> = {
  up: 'Move up',
  down: 'Move down',
  left: 'Move left',
  right: 'Move right',
};

const DIRECTION_ARROWS: Record<TDirection, string> = {
  up: '▲',
  down: '▼',
  left: '◀',
  right: '▶',
};

const Controls: React.FC<Props> = ({
  attemptMove,
  status,
  undo,
  undoDisabled,
  undoCountRemaining,
  showUndo,
  handleResetPress,
  handleResetLongPress,
  showResetHintInline,
  onNextLevel,
  nextDisabled,
  nextLabel,
  nextHighlighted = false,
}) => {
  const renderDpadButton = (direction: TDirection) => (
    <Pressable
      onPress={() => attemptMove(direction)}
      disabled={status !== 'playing'}
      accessibilityRole="button"
      accessibilityLabel={DIRECTION_LABELS[direction]}
      style={({ pressed }) => [
        gameStyles.dpadButton,
        pressed && gameStyles.buttonPressed,
        status !== 'playing' && gameStyles.buttonDisabled,
      ]}
    >
      <Text style={gameStyles.dpadArrow}>{DIRECTION_ARROWS[direction]}</Text>
    </Pressable>
  );

  const actionButtons: React.ReactNode[] = [];

  if (showUndo) {
    actionButtons.push(
      <Pressable
        key="undo"
        onPress={undo}
        disabled={undoDisabled}
        accessibilityRole="button"
        accessibilityLabel={`Undo, ${undoCountRemaining} remaining`}
        style={({ pressed }) => [
          gameStyles.actionButton,
          undoDisabled && gameStyles.buttonDisabled,
          pressed && !undoDisabled && gameStyles.buttonPressed,
        ]}
      >
        <Text style={gameStyles.buttonText}>Undo ({undoCountRemaining})</Text>
      </Pressable>,
    );
  }

  actionButtons.push(
    <View key="reset" style={gameStyles.resetButtonWrap}>
      {showResetHintInline ? (
        <View style={gameStyles.resetHintBubble}>
          <Text style={gameStyles.resetHintText}>Long press Reset to restart</Text>
        </View>
      ) : null}
      <Pressable
        onPress={handleResetPress}
        onLongPress={handleResetLongPress}
        delayLongPress={500}
        accessibilityRole="button"
        accessibilityLabel="Reset level. Long press to restart entire game."
        style={({ pressed }) => [gameStyles.actionButton, pressed && gameStyles.buttonPressed]}
      >
        <Text style={gameStyles.buttonText}>Reset</Text>
      </Pressable>
    </View>,
  );

  actionButtons.push(
    <Pressable
      key="next"
      onPress={onNextLevel}
      disabled={nextDisabled}
      accessibilityRole="button"
      accessibilityLabel={nextLabel}
      style={({ pressed }) => [
        gameStyles.actionButton,
        gameStyles.actionButtonLast,
        nextHighlighted && gameStyles.buttonPrimary,
        nextDisabled && gameStyles.buttonDisabled,
        pressed && !nextDisabled && gameStyles.buttonPressed,
      ]}
    >
      <Text style={[gameStyles.buttonText, nextHighlighted && gameStyles.buttonPrimaryText]}>{nextLabel}</Text>
    </Pressable>,
  );

  return (
    <View style={gameStyles.controlsSplit}>
      <View style={gameStyles.actionColumn}>{actionButtons}</View>

      <View style={gameStyles.dpadColumn}>
        <View style={gameStyles.dpad}>
          <View style={gameStyles.dpadRow}>
            <View style={gameStyles.dpadSpacer} />
            {renderDpadButton('up')}
            <View style={gameStyles.dpadSpacer} />
          </View>
          <View style={gameStyles.dpadRow}>
            {renderDpadButton('left')}
            <View style={gameStyles.dpadSpacer} />
            {renderDpadButton('right')}
          </View>
          <View style={gameStyles.dpadRow}>
            <View style={gameStyles.dpadSpacer} />
            {renderDpadButton('down')}
            <View style={gameStyles.dpadSpacer} />
          </View>
        </View>
      </View>
    </View>
  );
};

export default Controls;
