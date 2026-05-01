import React from 'react';
import { Pressable, Text, View } from 'react-native';

type Props = {
  attemptMove: (dir: 'up' | 'down' | 'left' | 'right') => void;
  status: string;
  undo: () => void;
  undoDisabled: boolean;
  undoCountRemaining: number;
  handleResetPress: () => void;
  handleResetLongPress: () => void;
  showResetHintInline: boolean;
  onNextLevel: () => void;
  nextDisabled: boolean;
  styles: any;
};

const Controls: React.FC<Props> = ({
  attemptMove,
  status,
  undo,
  undoDisabled,
  undoCountRemaining,
  handleResetPress,
  handleResetLongPress,
  showResetHintInline,
  onNextLevel,
  nextDisabled,
  styles,
}) => {
  return (
    <>
      <View style={styles.dpad}>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <Pressable
            onPress={() => attemptMove('up')}
            disabled={status !== 'playing'}
            style={({ pressed }) => [
              styles.dpadButton,
              pressed && styles.buttonPressed,
              status !== 'playing' && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Up</Text>
          </Pressable>
          <View style={styles.dpadSpacer} />
        </View>
        <View style={styles.dpadRow}>
          <Pressable
            onPress={() => attemptMove('left')}
            disabled={status !== 'playing'}
            style={({ pressed }) => [
              styles.dpadButton,
              pressed && styles.buttonPressed,
              status !== 'playing' && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Left</Text>
          </Pressable>
          <View style={styles.dpadSpacer} />
          <Pressable
            onPress={() => attemptMove('right')}
            disabled={status !== 'playing'}
            style={({ pressed }) => [
              styles.dpadButton,
              pressed && styles.buttonPressed,
              status !== 'playing' && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Right</Text>
          </Pressable>
        </View>
        <View style={styles.dpadRow}>
          <View style={styles.dpadSpacer} />
          <Pressable
            onPress={() => attemptMove('down')}
            disabled={status !== 'playing'}
            style={({ pressed }) => [
              styles.dpadButton,
              pressed && styles.buttonPressed,
              status !== 'playing' && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.buttonText}>Down</Text>
          </Pressable>
          <View style={styles.dpadSpacer} />
        </View>
      </View>

      <View style={styles.controlsRow}>
        <Pressable
          onPress={undo}
          disabled={undoDisabled}
          style={({ pressed }) => [
            styles.button,
            styles.controlsButtonSize,
            styles.controlsButton,
            undoDisabled && styles.buttonDisabled,
            pressed && !undoDisabled && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>Undo ({undoCountRemaining})</Text>
        </Pressable>

        <View style={styles.resetButtonWrap}>
          {showResetHintInline ? (
            <View style={styles.resetHintBubble}>
              <Text style={styles.resetHintText}>Long press Reset to restart</Text>
            </View>
          ) : null}
          <Pressable
            onPress={handleResetPress}
            onLongPress={handleResetLongPress}
            delayLongPress={500}
            style={({ pressed }) => [styles.button, styles.controlsButtonSize, styles.controlsButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>Reset ⏱</Text>
          </Pressable>
        </View>

        <Pressable
          onPress={onNextLevel}
          disabled={nextDisabled}
          style={({ pressed }) => [
            styles.button,
            styles.controlsButtonSize,
            styles.controlsButton,
            nextDisabled && styles.buttonDisabled,
            pressed && !nextDisabled && styles.buttonPressed,
          ]}
        >
          <Text style={styles.buttonText}>{nextDisabled ? 'Next Level' : 'Next Level'}</Text>
        </Pressable>
      </View>
    </>
  );
};

export default Controls;
