import React from 'react';
import { Animated, View } from 'react-native';
import type { TCell, TPosition } from '../../gameLogic';

type Props = {
  grid: TCell[][];
  position: TPosition;
  trail: boolean[][];
  goal: TPosition;
  playerScale: Animated.Value;
  goalPulse: Animated.Value;
  boardShakeX: Animated.Value;
  winFlashOpacity: Animated.Value;
  styles: any;
};

const Board: React.FC<Props> = ({ grid, position, trail, goal, playerScale, goalPulse, boardShakeX, winFlashOpacity, styles }) => {
  return (
    <Animated.View style={[styles.board, { transform: [{ translateX: boardShakeX }] }]}> 
      <Animated.View pointerEvents="none" style={[styles.winFlashOverlay, { opacity: winFlashOpacity }]} />
      {grid.map((row, r) => (
        <View key={`r-${r}`} style={styles.boardRow}>
          {row.map((cell, c) => {
            const isPlayer = position.row === r && position.col === c;
            const isGoal = goal.row === r && goal.col === c;
            const isPainted = trail[r]?.[c] ?? false;
            const isWallCell = cell === 'wall';

            return (
              <View
                key={`c-${r}-${c}`}
                style={[
                  styles.cell,
                  isWallCell && styles.cellWall,
                  !isWallCell && isPainted && styles.cellPainted,
                  isGoal && styles.cellGoal,
                  isPlayer && styles.cellPlayer,
                ]}
              >
                {isPlayer ? (
                  <Animated.Image
                    source={require('../../assets/car.png')}
                    style={[styles.playerEmoji, { transform: [{ scale: playerScale }] }]}
                  />
                ) : isGoal ? (
                  <View style={styles.goalMarkerSlot}>
                    <Animated.View
                      style={[
                        styles.goalMarker,
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
                      <View style={styles.goalMarkerRing} />
                      <View style={styles.goalMarkerCore} />
                      <View style={styles.goalMarkerDot} />
                    </Animated.View>
                  </View>
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
