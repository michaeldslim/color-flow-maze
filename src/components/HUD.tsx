import React from 'react';
import { Animated, Text, View } from 'react-native';

type Props = {
  title: string;
  subtitle: string;
  levelNumber: number;
  maxLevel: number;
  secondsLeft: number;
  isTimerWarning: boolean;
  isTimerCritical: boolean;
  timerPulse: Animated.Value;
  styles: any;
};

const HUD: React.FC<Props> = ({ title, subtitle, levelNumber, maxLevel, secondsLeft, isTimerWarning, isTimerCritical, timerPulse, styles }) => {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.hudContainer}>
        <View style={styles.hudRow}>
          <Text style={styles.hudText}>Level: {levelNumber}/{maxLevel}</Text>
          <Animated.Text
            style={[
              styles.hudText,
              isTimerWarning && styles.hudTimeWarning,
              isTimerCritical && styles.hudTimeCritical,
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
      </View>
    </>
  );
};

export default HUD;
