import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { gameStyles } from '../theme';

type Props = {
  levelNumber: number;
  visible: boolean;
};

const LevelTransition: React.FC<Props> = ({ levelNumber, visible }) => {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <View style={gameStyles.levelTransitionOverlay} pointerEvents="none">
      <View style={gameStyles.levelTransitionBadge}>
        <Text style={gameStyles.levelTransitionText}>{t('game.levelBadge', { n: levelNumber })}</Text>
      </View>
    </View>
  );
};

export default LevelTransition;
