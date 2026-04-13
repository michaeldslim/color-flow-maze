import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import Fireworks from './Fireworks';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  cloneTrail,
  createTrail,
  directionVector,
  generateLevel,
  inBounds,
  isBlocked,
  positionsEqual,
  slide,
  type TCell,
  type TDirection,
  type TGameSnapshot,
  type TGameStatus,
  type TLevel,
  type TPosition,
} from './gameLogic';

type TScreen = 'intro' | 'game';

type TSavedInLevelProgress = {
  position: TPosition;
  movesUsed: number;
  status: TGameStatus;
  undosUsed: number;
  secondsLeft: number;
  trail: boolean[][];
};

type TSavedProgress = {
  schemaVersion: number;
  screen: TScreen;
  levelNumber: number;
  levelSeeds: number[];
  gameCompleted: boolean;
  inLevelProgress?: TSavedInLevelProgress | null;
};

const MAX_LEVEL = 50;

const UNDO_LIMIT = 5;

const LEVEL_TIME_SECONDS = 60;

const TIMER_ENABLED = true;

const PROGRESS_STORAGE_KEY = 'color-flow-maze:progress:v1';

const PROGRESS_SCHEMA_VERSION = 1;

function isValidSavedInLevelProgress(value: unknown): value is TSavedInLevelProgress {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TSavedInLevelProgress>;
  const pos = candidate.position as Partial<TPosition> | undefined;

  if (!pos || typeof pos.row !== 'number' || !Number.isInteger(pos.row)) return false;
  if (typeof pos.col !== 'number' || !Number.isInteger(pos.col)) return false;
  if (typeof candidate.movesUsed !== 'number' || !Number.isInteger(candidate.movesUsed)) return false;
  if (
    candidate.status !== 'playing' &&
    candidate.status !== 'won' &&
    candidate.status !== 'lost'
  ) {
    return false;
  }
  if (typeof candidate.undosUsed !== 'number' || !Number.isInteger(candidate.undosUsed)) return false;
  if (typeof candidate.secondsLeft !== 'number' || !Number.isInteger(candidate.secondsLeft)) return false;
  if (!Array.isArray(candidate.trail)) return false;
  if (
    candidate.trail.some(
      (row) => !Array.isArray(row) || row.some((cell) => typeof cell !== 'boolean'),
    )
  ) {
    return false;
  }

  return true;
}

function isValidTrailForBoard(trail: boolean[][], rows: number, cols: number): boolean {
  if (trail.length !== rows) return false;
  return trail.every((row) => row.length === cols && row.every((cell) => typeof cell === 'boolean'));
}

function isValidSavedProgress(value: unknown): value is TSavedProgress {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<TSavedProgress>;

  if (candidate.schemaVersion !== PROGRESS_SCHEMA_VERSION) return false;
  if (candidate.screen !== 'intro' && candidate.screen !== 'game') return false;
  if (typeof candidate.levelNumber !== 'number' || !Number.isInteger(candidate.levelNumber)) return false;
  if (candidate.levelNumber < 1 || candidate.levelNumber > MAX_LEVEL) return false;
  if (!Array.isArray(candidate.levelSeeds) || candidate.levelSeeds.length < candidate.levelNumber) return false;
  if (candidate.levelSeeds.some((seed) => typeof seed !== 'number' || !Number.isInteger(seed))) return false;
  if (typeof candidate.gameCompleted !== 'boolean') return false;
  if (
    candidate.inLevelProgress !== undefined &&
    candidate.inLevelProgress !== null &&
    !isValidSavedInLevelProgress(candidate.inLevelProgress)
  ) {
    return false;
  }

  return true;
}

function AppContent() {
  const insets = useSafeAreaInsets();
  const bottomInset = Platform.OS === 'ios' ? Math.max(insets.bottom, 16) + 16 : 32;

  const [screen, setScreen] = useState<TScreen>('intro');
  const [hasResumeProgress, setHasResumeProgress] = useState<boolean>(false);

  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [levelSeeds, setLevelSeeds] = useState<number[]>(() => [Date.now() >>> 0]);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [isProgressLoaded, setIsProgressLoaded] = useState<boolean>(false);
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
    let cancelled = false;

    const loadProgress = async () => {
      try {
        const raw = await AsyncStorage.getItem(PROGRESS_STORAGE_KEY);
        if (!raw) return;

        const parsed: unknown = JSON.parse(raw);
        if (!isValidSavedProgress(parsed)) return;

        if (cancelled) return;

        setHasResumeProgress(
          parsed.screen === 'game' ||
            parsed.levelNumber > 1 ||
            parsed.gameCompleted ||
            parsed.inLevelProgress != null,
        );
        setLevelSeeds(parsed.levelSeeds);
        setLevelNumber(parsed.levelNumber);
        setGameCompleted(parsed.gameCompleted);
        setPendingInLevelRestore(parsed.screen === 'game' ? parsed.inLevelProgress ?? null : null);
      } catch {
        // ignore invalid/corrupt save data
      } finally {
        if (!cancelled) {
          setIsProgressLoaded(true);
        }
      }
    };

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentSeed = levelSeeds[levelNumber - 1] ?? (Date.now() >>> 0);
  const level = useMemo(() => generateLevel(levelNumber, currentSeed), [levelNumber, currentSeed]);
  const { grid, start, goal } = level;

  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const [position, setPosition] = useState<TPosition>(start);
  const [movesUsed, setMovesUsed] = useState<number>(0);
  const [status, setStatus] = useState<TGameStatus>('playing');
  const [undosUsed, setUndosUsed] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(LEVEL_TIME_SECONDS);
  const [trail, setTrail] = useState<boolean[][]>(() => {
    const t = createTrail(rows, cols);
    t[start.row][start.col] = true;
    return t;
  });
  const [history, setHistory] = useState<TGameSnapshot[]>([]);
  const [pendingInLevelRestore, setPendingInLevelRestore] = useState<TSavedInLevelProgress | null>(null);

  const pushHistory = (snapshot: TGameSnapshot) => {
    setHistory((prev) => [snapshot, ...prev].slice(0, 200));
  };

  const reset = () => {
    setPosition(start);
    setMovesUsed(0);
    setStatus('playing');
    setUndosUsed(0);
    setSecondsLeft(LEVEL_TIME_SECONDS);
    setHistory([]);
    setTrail(() => {
      const t = createTrail(rows, cols);
      t[start.row][start.col] = true;
      return t;
    });
  };

  const newLevel = () => {
    if (levelNumber >= MAX_LEVEL) return;
    setLevelSeeds((prev) => {
      if (prev[levelNumber]) return prev;
      const next = prev.slice();
      next[levelNumber] = ((Date.now() + levelNumber * 9973) >>> 0) as number;
      return next;
    });
    setLevelNumber((n) => n + 1);
  };

  const restartGame = () => {
    const seed = Date.now() >>> 0;
    setGameCompleted(false);
    setShowFireworks(false);
    setLevelSeeds([seed]);
    setLevelNumber(1);
    setPendingInLevelRestore(null);
    setHasResumeProgress(true);
  };

  const continueGame = () => {
    setScreen('game');
  };

  const startNewGame = () => {
    restartGame();
    setScreen('game');
  };

  useEffect(() => {
    if (pendingInLevelRestore) {
      const restoredPosition = pendingInLevelRestore.position;
      const hasValidPosition = inBounds(grid, restoredPosition) && !isBlocked(grid, restoredPosition);
      const hasValidTrail = isValidTrailForBoard(pendingInLevelRestore.trail, rows, cols);
      const hasStartMarked = pendingInLevelRestore.trail[start.row]?.[start.col] === true;

      if (hasValidPosition && hasValidTrail && hasStartMarked) {
        setPosition(restoredPosition);
        setMovesUsed(Math.max(0, pendingInLevelRestore.movesUsed));
        setStatus(pendingInLevelRestore.status);
        setUndosUsed(Math.min(UNDO_LIMIT, Math.max(0, pendingInLevelRestore.undosUsed)));
        setSecondsLeft(Math.min(LEVEL_TIME_SECONDS, Math.max(0, pendingInLevelRestore.secondsLeft)));
        setHistory([]);
        setTrail(cloneTrail(pendingInLevelRestore.trail));
        setPendingInLevelRestore(null);
        return;
      }

      setPendingInLevelRestore(null);
    }

    setPosition(start);
    setMovesUsed(0);
    setStatus('playing');
    setUndosUsed(0);
    setSecondsLeft(LEVEL_TIME_SECONDS);
    setHistory([]);
    setTrail(() => {
      const t = createTrail(rows, cols);
      t[start.row][start.col] = true;
      return t;
    });
  }, [pendingInLevelRestore, levelNumber, rows, cols, start.row, start.col, grid]);

  useEffect(() => {
    if (!isProgressLoaded) return;
    if (pendingInLevelRestore) return;
    if (screen === 'intro' && hasResumeProgress) return;

    const saveProgress = async () => {
      const payload: TSavedProgress = {
        schemaVersion: PROGRESS_SCHEMA_VERSION,
        screen,
        levelNumber,
        levelSeeds,
        gameCompleted,
        inLevelProgress:
          screen === 'game'
            ? {
                position,
                movesUsed,
                status,
                undosUsed,
                secondsLeft,
                trail,
              }
            : null,
      };

      try {
        await AsyncStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(payload));
      } catch {
        // ignore storage write errors
      }
    };

    void saveProgress();
  }, [
    isProgressLoaded,
    pendingInLevelRestore,
    screen,
    levelNumber,
    levelSeeds,
    gameCompleted,
    position,
    movesUsed,
    status,
    undosUsed,
    secondsLeft,
    trail,
    hasResumeProgress,
  ]);

  useEffect(() => {
    if (!TIMER_ENABLED) return;
    if (gameCompleted) return;
    if (status !== 'playing') return;
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus('lost');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      clearInterval(id);
    };
  }, [status, secondsLeft, gameCompleted]);

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

  const undo = () => {
    if (undosUsed >= UNDO_LIMIT) return;
    setHistory((prev) => {
      const [latest, ...rest] = prev;
      if (!latest) return prev;
      setPosition(latest.position);
      setMovesUsed(latest.movesUsed);
      setStatus(latest.status);
      setTrail(latest.trail);
      setUndosUsed((u) => u + 1);
      return rest;
    });
  };

  const attemptMove = (direction: TDirection) => {
    if (status !== 'playing') return;
    if (TIMER_ENABLED && secondsLeft <= 0) return;

    const { dr, dc } = directionVector(direction);

    let cur: TPosition = position;
    let next: TPosition = { row: cur.row + dr, col: cur.col + dc };
    if (isBlocked(grid, next)) {
      shakeBoard();
      return;
    }

    pushHistory({ position, movesUsed, status, trail: cloneTrail(trail) });

    const nextTrail = cloneTrail(trail);

    while (!isBlocked(grid, next)) {
      cur = next;
      nextTrail[cur.row][cur.col] = true;
      next = { row: cur.row + dr, col: cur.col + dc };
    }

    const newMovesUsed = movesUsed + 1;
    const didWin = positionsEqual(cur, goal);

    setPosition(cur);
    setTrail(nextTrail);
    setMovesUsed(newMovesUsed);

    if (didWin) {
      pulsePlayer('win');
      setStatus('won');
      if (levelNumber >= MAX_LEVEL) {
        setGameCompleted(true);
      }
      return;
    }

    pulsePlayer('move');
  };

  const headerText =
    gameCompleted
      ? 'You beat the game!'
      : status === 'won'
        ? 'You won!'
      : status === 'lost'
        ? 'Time up'
        : 'Use the D-pad';

  const isTimerWarning = TIMER_ENABLED && status === 'playing' && secondsLeft > 0 && secondsLeft <= 10;
  const isTimerCritical = isTimerWarning && secondsLeft <= 5;

  if (!isProgressLoaded) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.container, styles.loadingContainer]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.subtitle}>Loading progress...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'intro') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.introHeader}>
          <Text style={styles.title}>Color Flow Maze</Text>
          <Text style={styles.subtitle}>색깔 길찾기</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.introScrollContent,
            { paddingBottom: 40 + bottomInset },
          ]}
          alwaysBounceVertical
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.introCard}>
            <Text style={styles.introSectionTitle}>플레이 방법</Text>
            <Text style={styles.introText}>- 방향 버튼을 누르세요.</Text>
            <Text style={styles.introText}>- 벽에 부딪힐 때까지 미끄러집니다.</Text>
            <Text style={styles.introText}>- 오렌지색 칸에 “멈춰야” 승리합니다.</Text>
            <Text style={styles.introText}>- 50레벨을 클리어하면 게임을 완료합니다.</Text>
            <Text style={styles.introText}>- Reset 버튼을 길게 누르면 게임이 처음부터 다시 시작됩니다.</Text>

            <View style={styles.introDivider} />

            <Text style={styles.introSectionTitle}>How to play</Text>
            <Text style={styles.introText}>- Press the arrow buttons.</Text>
            <Text style={styles.introText}>- You slide until you hit a wall.</Text>
            <Text style={styles.introText}>- You win only if you STOP on the orange tile.</Text>
            <Text style={styles.introText}>- Beat Level 50 to finish the game.</Text>
            <Text style={styles.introText}>- Long-press Reset to restart the whole game.</Text>
          </View>

          <Pressable
            onPress={continueGame}
            disabled={!hasResumeProgress}
            style={({ pressed }) => [
              styles.primaryButton,
              styles.introSecondaryButton,
              !hasResumeProgress && styles.buttonDisabled,
              pressed && hasResumeProgress && styles.buttonPressed,
            ]}
          >
            <Text style={[styles.primaryButtonText, hasResumeProgress && styles.resumePrimaryButtonText]}>
              {hasResumeProgress
                ? `From Level ${levelNumber} / 레벨 ${levelNumber} 이어하기`
                : 'Continue / 이어하기'}
            </Text>
          </Pressable>

          <Pressable
            onPress={startNewGame}
            style={({ pressed }) => [styles.button, styles.introSecondaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.buttonText}>New Game / 새 게임</Text>
          </Pressable>

          <StatusBar style="auto" />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
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

        <StatusBar style="auto" />
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
