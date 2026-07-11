import React from 'react';
import { Animated, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { TCell, TPosition } from '../../gameLogic';
import { gameStyles } from '../theme';

type Props = {
  grid: TCell[][];
  position: TPosition;
  trail: boolean[][];
  goal: TPosition;
  requiredCells: TPosition[];
  playerScale: Animated.Value;
  goalPulse: Animated.Value;
  boardShakeX: Animated.Value;
  winFlashOpacity: Animated.Value;
};

const Board: React.FC<Props> = ({
  grid,
  position,
  trail,
  goal,
  requiredCells,
  playerScale,
  goalPulse,
  boardShakeX,
  winFlashOpacity,
}) => {
  const { t } = useTranslation();

  const requiredKeys = new Set((requiredCells ?? []).map((pos) => `${pos.row},${pos.col}`));

  const cellAccessibilityLabel = (
    cell: TCell,
    isPlayer: boolean,
    isGoal: boolean,
    isPainted: boolean,
    isRequired: boolean,
    row: number,
    col: number,
  ): string => {
    const coords = { row: row + 1, col: col + 1 };
    if (isPlayer) return t('board.playerAt', coords);
    if (isGoal) return t('board.goalAt', coords);
    if (cell === 'wall') return t('board.wallAt', coords);
    if (cell === 'ice') return t('board.iceAt', coords);
    if (isPainted) return t('board.trailAt', coords);
    if (isRequired) return t('board.requiredAt', coords);
    return t('board.emptyAt', coords);
  };

  return (
    <Animated.View style={[gameStyles.board, { transform: [{ translateX: boardShakeX }] }]}>
      <Animated.View pointerEvents="none" style={[gameStyles.winFlashOverlay, { opacity: winFlashOpacity }]} />
      {grid.map((row, r) => (
        <View key={`r-${r}`} style={gameStyles.boardRow}>
          {row.map((cell, c) => {
            const isPlayer = position.row === r && position.col === c;
            const isGoal = goal.row === r && goal.col === c;
            const isPainted = trail[r]?.[c] ?? false;
            const isWallCell = cell === 'wall';
            const isIceCell = cell === 'ice';
            const isRequired = requiredKeys.has(`${r},${c}`);

            return (
              <View
                key={`c-${r}-${c}`}
                accessibilityLabel={cellAccessibilityLabel(cell, isPlayer, isGoal, isPainted, isRequired, r, c)}
                style={[
                  gameStyles.cell,
                  isWallCell && gameStyles.cellWall,
                  isIceCell && gameStyles.cellIce,
                  !isWallCell && !isIceCell && isRequired && !isPainted && gameStyles.cellRequired,
                  !isWallCell && !isIceCell && isPainted && gameStyles.cellPainted,
                  isGoal && gameStyles.cellGoal,
                  isPlayer && gameStyles.cellPlayer,
                ]}
              >
                {isPlayer ? (
                  <Animated.Image
                    source={require('../../assets/car.png')}
                    style={[gameStyles.playerEmoji, { transform: [{ scale: playerScale }] }]}
                  />
                ) : isGoal ? (
                  <View style={gameStyles.goalMarkerSlot}>
                    <Animated.View
                      style={[
                        gameStyles.goalMarker,
                        {
                          transform: [
                            {
                              translateY: goalPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [0.5, -2],
                              }),
                            },
                            {
                              scale: goalPulse.interpolate({
                                inputRange: [0, 1],
                                outputRange: [1, 1.03],
                              }),
                            },
                          ],
                        },
                      ]}
                    >
                      <View style={gameStyles.goalMarkerRing} />
                      <View style={gameStyles.goalMarkerCore} />
                      <View style={gameStyles.goalMarkerDot} />
                    </Animated.View>
                  </View>
                ) : isIceCell ? (
                  <Text style={gameStyles.iceMarker} accessible={false}>
                    ❄
                  </Text>
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </Animated.View>
  );
};

export default Board;
