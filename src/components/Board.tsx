import React from 'react';
import { Animated, Text, View } from 'react-native';
import type { TCell, TPosition } from '../../gameLogic';
import { gameStyles } from '../theme';

type Props = {
  grid: TCell[][];
  position: TPosition;
  trail: boolean[][];
  goal: TPosition;
  playerScale: Animated.Value;
  goalPulse: Animated.Value;
  boardShakeX: Animated.Value;
  winFlashOpacity: Animated.Value;
};

function cellAccessibilityLabel(
  cell: TCell,
  isPlayer: boolean,
  isGoal: boolean,
  isPainted: boolean,
  row: number,
  col: number,
): string {
  if (isPlayer) return `Player at row ${row + 1} column ${col + 1}`;
  if (isGoal) return `Goal at row ${row + 1} column ${col + 1}`;
  if (cell === 'wall') return `Wall at row ${row + 1} column ${col + 1}`;
  if (cell === 'ice') return `Ice tile at row ${row + 1} column ${col + 1}`;
  if (isPainted) return `Trail at row ${row + 1} column ${col + 1}`;
  return `Empty at row ${row + 1} column ${col + 1}`;
}

const Board: React.FC<Props> = ({
  grid,
  position,
  trail,
  goal,
  playerScale,
  goalPulse,
  boardShakeX,
  winFlashOpacity,
}) => {
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

            return (
              <View
                key={`c-${r}-${c}`}
                accessibilityLabel={cellAccessibilityLabel(cell, isPlayer, isGoal, isPainted, r, c)}
                style={[
                  gameStyles.cell,
                  isWallCell && gameStyles.cellWall,
                  isIceCell && gameStyles.cellIce,
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
