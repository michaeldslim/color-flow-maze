import React from 'react';
import { Animated, Text, View } from 'react-native';
import { gameStyles } from '../theme';

type Props = {
  title: string;
  subtitle: string;
  levelNumber: number;
  maxLevel: number;
  movesUsed: number;
  moveLimit: number;
  timerEnabled: boolean;
  secondsLeft: number;
  isTimerWarning: boolean;
  isTimerCritical: boolean;
  timerPulse: Animated.Value;
};

const HUD: React.FC<Props> = ({
  title,
  subtitle,
  levelNumber,
  maxLevel,
  movesUsed,
  moveLimit,
  timerEnabled,
  secondsLeft,
  isTimerWarning,
  isTimerCritical,
  timerPulse,
}) => {
  const movesRemaining = Math.max(0, moveLimit - movesUsed);
  const progress = Math.min(1, levelNumber / maxLevel);

  return (
    <>
      <Text style={gameStyles.title}>{title}</Text>
      <Text style={gameStyles.subtitle}>{subtitle}</Text>

      <View style={gameStyles.hudContainer}>
        <View style={gameStyles.hudRow}>
          <Text style={gameStyles.hudText} accessibilityLabel={`Level ${levelNumber} of ${maxLevel}`}>
            Level: {levelNumber}/{maxLevel}
          </Text>
          <Text
            style={gameStyles.hudText}
            accessibilityLabel={`${movesRemaining} moves remaining out of ${moveLimit}`}
          >
            Moves: {movesRemaining}/{moveLimit}
          </Text>
        </View>

        {timerEnabled ? (
          <View style={[gameStyles.hudRow, { marginTop: 6, justifyContent: 'flex-end' }]}>
            <Animated.Text
              accessibilityLabel={`${secondsLeft} seconds remaining`}
              style={[
                gameStyles.hudText,
                isTimerWarning && gameStyles.hudTimeWarning,
                isTimerCritical && gameStyles.hudTimeCritical,
                isTimerWarning && {
                  transform: [
                    {
                      scale: timerPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }),
                    },
                  ],
                },
              ]}
            >
              Time: {secondsLeft}s
            </Animated.Text>
          </View>
        ) : null}

        <View
          style={gameStyles.progressTrack}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: maxLevel, now: levelNumber }}
        >
          <View style={[gameStyles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
      </View>
    </>
  );
};

export default HUD;
