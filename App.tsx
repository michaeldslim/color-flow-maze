import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import Fireworks from './Fireworks';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import useGame from './src/useGame';
import { MAX_LEVEL, UNDO_LIMIT, LEVEL_TIME_SECONDS, TIMER_ENABLED } from './src/constants';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Intro from './src/screens/Intro';
import {
  type TDirection,
  type TGameStatus,
} from './gameLogic';

function AppContent() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) + 16 : 32;
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0);

  const {
    screen,
    hasResumeProgress,
    level,
    levelNumber,
    gameCompleted,
    isProgressLoaded,
    position,
    status,
    undosUsed,
    secondsLeft,
    trail,
    history,
    reset,
    newLevel,
    restartGame,
    continueGame,
    startNewGame,
    undo,
    attemptMove,
  } = useGame();

  const { grid, goal } = level;

  const [showFireworks, setShowFireworks] = useState<boolean>(false);
  const [showResetHintInline, setShowResetHintInline] = useState<boolean>(false);
  const prevGameCompletedRef = useRef<boolean>(false);

  const lastStatusRef = useRef<TGameStatus>('playing');

  const winPlayer = useAudioPlayer(require('./assets/sounds/win.mp3'));
  const congratsPlayer = useAudioPlayer(require('./assets/sounds/congrats.mp3'));

  const boardShakeX = useRef(new Animated.Value(0)).current;
  const playerScale = useRef(new Animated.Value(1)).current;
  const goalPulse = useRef(new Animated.Value(0)).current;
  const timerPulse = useRef(new Animated.Value(0)).current;
  const winFlashOpacity = useRef(new Animated.Value(0)).current;
  const lastTimerWarningHapticRef = useRef<number>(LEVEL_TIME_SECONDS + 1);
  const hasShownResetHintInlineRef = useRef<boolean>(false);
  const didTriggerResetLongPressRef = useRef<boolean>(false);

  const shakeBoard = () => {
    boardShakeX.stopAnimation();
    boardShakeX.setValue(0);
    Animated.sequence([
      Animated.timing(boardShakeX, {
        toValue: 8,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeX, {
        toValue: -8,
        duration: 40,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeX, {
        toValue: 6,
        duration: 35,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeX, {
        toValue: -6,
        duration: 35,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      Animated.timing(boardShakeX, {
        toValue: 0,
        duration: 50,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showResetHintInlineOnce = () => {
    if (hasShownResetHintInlineRef.current) return;
    hasShownResetHintInlineRef.current = true;
    setShowResetHintInline(true);
  };

  const handleResetPress = () => {
    if (didTriggerResetLongPressRef.current) {
      didTriggerResetLongPressRef.current = false;
      return;
    }

    reset();
    showResetHintInlineOnce();
  };

  const handleResetLongPress = () => {
    didTriggerResetLongPressRef.current = true;
    restartGame();
  };

  useEffect(() => {
    if (!showResetHintInline) return;

    const timeoutId = setTimeout(() => {
      setShowResetHintInline(false);
    }, 1800);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [showResetHintInline]);

  useEffect(() => {
    if (screen !== 'game') {
      goalPulse.stopAnimation();
      goalPulse.setValue(0);
      return;
    }

    goalPulse.stopAnimation();
    goalPulse.setValue(0);

    const goalPulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(goalPulse, {
          toValue: 1,
          duration: 380,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(goalPulse, {
          toValue: 0,
          duration: 420,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    goalPulseLoop.start();

    return () => {
      goalPulseLoop.stop();
      goalPulse.stopAnimation();
    };
  }, [goalPulse, levelNumber, screen]);

  const pulsePlayer = (strength: 'move' | 'win') => {
    playerScale.stopAnimation();
    playerScale.setValue(1);
    const peak = strength === 'win' ? 1.28 : 1.16;
    Animated.sequence([
      Animated.timing(playerScale, {
        toValue: peak,
        duration: strength === 'win' ? 140 : 90,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(playerScale, {
        toValue: 1,
        duration: strength === 'win' ? 180 : 120,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const triggerWinFeedback = async () => {
    try {
      if (Platform.OS === 'ios') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
  }, []);


  

  useEffect(() => {
    if (!TIMER_ENABLED) return;

    const shouldWarn = screen === 'game' && status === 'playing' && secondsLeft > 0 && secondsLeft <= 10;
    if (!shouldWarn) {
      timerPulse.stopAnimation();
      timerPulse.setValue(0);
      lastTimerWarningHapticRef.current = LEVEL_TIME_SECONDS + 1;
      return;
    }

    timerPulse.stopAnimation();
    timerPulse.setValue(0);
    Animated.sequence([
      Animated.timing(timerPulse, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(timerPulse, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    if (secondsLeft % 2 === 0 && lastTimerWarningHapticRef.current !== secondsLeft) {
      lastTimerWarningHapticRef.current = secondsLeft;
      void Haptics.selectionAsync().catch(() => undefined);
    }
  }, [screen, status, secondsLeft, timerPulse]);

  useEffect(() => {
    if (gameCompleted && !prevGameCompletedRef.current) {
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 4500);
    }
    prevGameCompletedRef.current = gameCompleted;
  }, [gameCompleted]);

  useEffect(() => {
    const last = lastStatusRef.current;
    if (last !== 'won' && status === 'won') {
      void triggerWinFeedback();
      winFlashOpacity.stopAnimation();
      winFlashOpacity.setValue(0);
      Animated.sequence([
        Animated.timing(winFlashOpacity, {
          toValue: 0.34,
          duration: 140,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(winFlashOpacity, {
          toValue: 0,
          duration: 260,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      winPlayer.seekTo(0);
      winPlayer.play();

      if (levelNumber >= MAX_LEVEL) {
        setTimeout(() => {
          congratsPlayer.seekTo(0);
          congratsPlayer.play();
        }, 350);
      }
    }
    lastStatusRef.current = status;
  }, [status, levelNumber, winFlashOpacity]);

  useEffect(() => {
    if (status !== 'won' || gameCompleted) return;

    const id = setTimeout(() => {
      newLevel();
    }, 3000);

    return () => {
      clearTimeout(id);
    };
  }, [status, gameCompleted]);

  const handleAttemptMove = (direction: TDirection) => {
    const result = attemptMove(direction);
    if (!result) return;
    if (result.blocked) {
      shakeBoard();
      return;
    }
    if (result.didWin) {
      pulsePlayer('win');
      return;
    }
    pulsePlayer('move');
  };

  const headerText =
    gameCompleted
      ? 'You beat the game!'
      : status === 'won'
        ? 'Stage Clear!'
      : status === 'lost'
        ? 'Time up'
        : 'Use the D-pad';

  const isTimerWarning = TIMER_ENABLED && status === 'playing' && secondsLeft > 0 && secondsLeft <= 10;
  const isTimerCritical = isTimerWarning && secondsLeft <= 5;

  if (!isProgressLoaded) {
    return (
      <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }] }>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.subtitle}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'intro') {
    return (
      <Intro
        hasResumeProgress={hasResumeProgress}
        levelNumber={levelNumber}
        continueGame={continueGame}
        startNewGame={startNewGame}
        bottomInset={bottomInset}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { paddingTop: topPadding }] }>
      <View style={[styles.container, { paddingBottom: 12 + bottomInset }]}>
        <Text style={styles.title}>Color Flow Maze</Text>
        <Text style={styles.subtitle}>{headerText}</Text>

        <View style={styles.hudContainer}>
          <View style={styles.hudRow}>
            <Text style={styles.hudText}>Level: {levelNumber}/{MAX_LEVEL}</Text>
            <Animated.Text
              style={[
                styles.hudText,
                isTimerWarning && styles.hudTimeWarning,
                isTimerCritical && styles.hudTimeCritical,
                isTimerWarning && {
                  transform: [
                    {
                      scale: timerPulse.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 1.08],
                      }),
                    },
                  ],
                },
              ]}
            >
              Time: {secondsLeft}s
            </Animated.Text>
          </View>
        </View>

        <View style={styles.boardWrapper}>
          <Animated.View style={[styles.board, { transform: [{ translateX: boardShakeX }] }]}> 
            <Animated.View pointerEvents="none" style={[styles.winFlashOverlay, { opacity: winFlashOpacity }]} />
            {grid.map((row, r) => (
              <View key={`r-${r}`} style={styles.boardRow}>
                {row.map((cell, c) => {
                  const isPlayer = position.row === r && position.col === c;
                  const isGoal = goal.row === r && goal.col === c;
                  const isPainted = trail[r]?.[c] ?? false;
                  const isWallCell = cell === 'wall';
                  const isIceCell = cell === 'ice';

                  return (
                    <View
                      key={`c-${r}-${c}`}
                      style={[
                        styles.cell,
                        isWallCell && styles.cellWall,
                        isIceCell && styles.cellIce,
                        !isWallCell && !isIceCell && isPainted && styles.cellPainted,
                        isGoal && styles.cellGoal,
                        isPlayer && styles.cellPlayer,
                      ]}
                    >
                      {isPlayer ? (
                        <Animated.Image
                          source={require('./assets/car.png')}
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
        </View>

        <View style={styles.dpad}>
          <View style={styles.dpadRow}>
            <View style={styles.dpadSpacer} />
            <Pressable
              onPress={() => handleAttemptMove('up')}
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
              onPress={() => handleAttemptMove('left')}
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
              onPress={() => handleAttemptMove('right')}
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
              onPress={() => handleAttemptMove('down')}
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
            disabled={history.length === 0 || undosUsed >= UNDO_LIMIT}
            style={({ pressed }) => [
              styles.button,
              styles.controlsButtonSize,
              styles.controlsButton,
              (history.length === 0 || undosUsed >= UNDO_LIMIT) && styles.buttonDisabled,
              pressed && history.length > 0 && undosUsed < UNDO_LIMIT && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Undo ({Math.max(0, UNDO_LIMIT - undosUsed)})</Text>
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
              style={({ pressed }) => [
                styles.button,
                styles.controlsButtonSize,
                styles.controlsButton,
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Reset ⏱</Text>
            </Pressable>
          </View>

          <Pressable
            onPress={gameCompleted ? restartGame : newLevel}
            disabled={!gameCompleted && status !== 'won'}
            style={({ pressed }) => [
              styles.button,
              styles.controlsButtonSize,
              styles.controlsButton,
              !gameCompleted && status !== 'won' && styles.buttonDisabled,
              pressed && (gameCompleted || status === 'won') && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>{gameCompleted ? 'Restart' : 'Next Level'}</Text>
          </Pressable>
        </View>

        <StatusBar style="light" />
        <Fireworks visible={showFireworks} />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    alignItems: 'center',
  },
  introHeader: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingBottom: 8,
  },
  introScroll: {
    flex: 1,
  },
  introScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  hudContainer: {
    marginTop: 10,
    width: '100%',
  },
  title: {
    color: '#E6EEF9',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    marginTop: 6,
    color: '#B6C5E3',
    fontSize: 16,
  },
  introCard: {
    marginTop: 16,
    width: '100%',
    maxWidth: 420,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    backgroundColor: '#111A2E',
    borderWidth: 1,
    borderColor: '#1E2A45',
  },
  introText: {
    color: '#E6EEF9',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  introSectionTitle: {
    color: '#B6C5E3',
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 10,
  },
  introDivider: {
    height: 1,
    backgroundColor: '#1E2A45',
    marginVertical: 10,
  },
  primaryButton: {
    marginTop: 16,
    width: '100%',
    maxWidth: 420,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    borderWidth: 1,
    borderColor: '#2563EB',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  resumePrimaryButtonText: {
    fontSize: 13,
  },
  introSecondaryButton: {
    marginTop: 10,
    width: '100%',
    maxWidth: 420,
  },
  hudRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudText: {
    color: '#E6EEF9',
    fontSize: 16,
    fontWeight: '600',
  },
  hudTimeWarning: {
    color: '#FBBF24',
  },
  hudTimeCritical: {
    color: '#FB7185',
  },
  boardWrapper: {
    marginTop: 20,
    width: '100%',
    alignItems: 'center',
  },
  board: {
    width: '100%',
    maxWidth: 360,
    aspectRatio: 1,
    backgroundColor: '#111A2E',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#1E2A45',
    position: 'relative',
    overflow: 'hidden',
  },
  winFlashOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#7DD3FC',
  },
  boardRow: {
    flex: 1,
    flexDirection: 'row',
  },
  cell: {
    flex: 1,
    margin: 2,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1B2844',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellWall: {
    backgroundColor: '#4B2E83',
    borderColor: '#4B2E83',
  },
  cellIce: {
    backgroundColor: '#1E3A8A',
    borderColor: '#2563EB',
  },
  cellPainted: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  cellGoal: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  cellPlayer: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  playerEmojiWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerEmoji: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
    borderRadius: 6,
    overflow: 'hidden',
  },
  goalMarkerSlot: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMarker: {
    width: '74%',
    height: '74%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalMarkerRing: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 999,
    borderWidth: 2,
    borderColor: '#FEF3C7',
  },
  goalMarkerCore: {
    width: '58%',
    height: '58%',
    borderRadius: 999,
    backgroundColor: '#FDE68A',
  },
  goalMarkerDot: {
    position: 'absolute',
    width: '28%',
    height: '28%',
    borderRadius: 999,
    backgroundColor: '#B45309',
  },
  controlsRow: {
    marginTop: 24,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  controlsButtonSize: {
    minWidth: 105,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  controlsButton: {
    marginHorizontal: 6,
  },
  resetButtonWrap: {
    position: 'relative',
  },
  resetHintBubble: {
    position: 'absolute',
    bottom: '100%',
    marginBottom: 6,
    alignSelf: 'center',
    backgroundColor: '#0F172A',
    borderColor: '#334155',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 8,
    zIndex: 10,
  },
  resetHintText: {
    color: '#CBD5E1',
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  dpad: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
  dpadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  dpadSpacer: {
    width: 76,
  },
  dpadButton: {
    minWidth: 78,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#1E2A45',
    borderWidth: 1,
    borderColor: '#2B3B63',
    alignItems: 'center',
  },
  button: {
    minWidth: 120,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#1E2A45',
    borderWidth: 1,
    borderColor: '#2B3B63',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
    backgroundColor: '#263454',
  },
  buttonText: {
    color: '#E6EEF9',
    fontSize: 14,
    fontWeight: '700',
  },
  helpText: {
    marginTop: 14,
    color: '#93A4C7',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});
