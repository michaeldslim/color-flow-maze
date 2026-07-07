import React from 'react';
import { Text, View } from 'react-native';
import { gameStyles } from '../theme';

type Props = {
  levelNumber: number;
  visible: boolean;
};

const LevelTransition: React.FC<Props> = ({ levelNumber, visible }) => {
  if (!visible) return null;

  return (
    <View style={gameStyles.levelTransitionOverlay} pointerEvents="none">
      <View style={gameStyles.levelTransitionBadge}>
        <Text style={gameStyles.levelTransitionText}>Level {levelNumber}</Text>
      </View>
    </View>
  );
};

export default LevelTransition;
