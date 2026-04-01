import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import Fireworks from './Fireworks';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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

const MAX_LEVEL = 50;

const UNDO_LIMIT = 5;

const LEVEL_TIME_SECONDS = 60;

const TIMER_ENABLED = true;

export default function App() {
  const topInset = Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0;
  const bottomInset = Platform.OS === 'ios' ? 48 : 32;

  const [screen, setScreen] = useState<TScreen>('intro');

  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [levelSeeds, setLevelSeeds] = useState<number[]>(() => [Date.now() >>> 0]);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [showFireworks, setShowFireworks] = useState<boolean>(false);
  const prevGameCompletedRef = useRef<boolean>(false);

  const lastStatusRef = useRef<TGameStatus>('playing');

  const winPlayer = useAudioPlayer(require('./assets/sounds/win.mp3'));
  const congratsPlayer = useAudioPlayer(require('./assets/sounds/congrats.mp3'));

  const boardShakeX = useRef(new Animated.Value(0)).current;
  const playerScale = useRef(new Animated.Value(1)).current;

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

  React.useEffect(() => {
    void setAudioModeAsync({ playsInSilentMode: true });
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
  };

  const startGame = () => {
    restartGame();
    setScreen('game');
  };

  React.useEffect(() => {
    setGameCompleted(false);
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
  }, [levelNumber, rows, cols, start.row, start.col]);

  React.useEffect(() => {
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

  React.useEffect(() => {
    if (gameCompleted && !prevGameCompletedRef.current) {
      setShowFireworks(true);
      setTimeout(() => setShowFireworks(false), 4500);
    }
    prevGameCompletedRef.current = gameCompleted;
  }, [gameCompleted]);

  React.useEffect(() => {
    const last = lastStatusRef.current;
    if (last !== 'won' && status === 'won') {
      void triggerWinFeedback();
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
  }, [status, levelNumber]);

  React.useEffect(() => {
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

  if (screen === 'intro') {
    return (
      <View style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={[
            styles.introScrollContent,
            { paddingTop: 12 + topInset, paddingBottom: 16 + bottomInset },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Color Flow Maze</Text>
          <Text style={styles.subtitle}>How to play</Text>

          <View style={styles.introCard}>
            <Text style={styles.introSectionTitle}>플레이 방법</Text>
            <Text style={styles.introText}>- 방향 버튼을 누르세요.</Text>
            <Text style={styles.introText}>- 벽에 부딪힐 때까지 미끄러집니다.</Text>
            <Text style={styles.introText}>- 금색 칸에 “멈춰야” 승리합니다.</Text>
            <Text style={styles.introText}>- 50레벨을 클리어하면 게임을 완료합니다.</Text>
            <Text style={styles.introText}>- Reset 버튼을 길게 누르면 게임이 처음부터 다시 시작됩니다.</Text>

            <View style={styles.introDivider} />

            <Text style={styles.introSectionTitle}>How to play</Text>
            <Text style={styles.introText}>- Press the arrow buttons.</Text>
            <Text style={styles.introText}>- You slide until you hit a wall.</Text>
            <Text style={styles.introText}>- You win only if you STOP on the gold tile.</Text>
            <Text style={styles.introText}>- Beat Level 50 to finish the game.</Text>
            <Text style={styles.introText}>- Long-press Reset to restart the whole game.</Text>
          </View>

          <Pressable
            onPress={startGame}
            style={({ pressed }) => [styles.primaryButton, pressed && styles.buttonPressed]}
          >
            <Text style={styles.primaryButtonText}>Start Game / 게임 시작</Text>
          </Pressable>

          <StatusBar style="auto" />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.safeArea}>
      <View style={[styles.container, { paddingTop: 12 + topInset, paddingBottom: 12 + bottomInset }]}>
        <Text style={styles.title}>Color Flow Maze</Text>
        <Text style={styles.subtitle}>{headerText}</Text>

        <View style={styles.hudContainer}>
          <View style={styles.hudRow}>
            <Text style={styles.hudText}>Level: {levelNumber}/{MAX_LEVEL}</Text>
            <Text style={styles.hudText}>Time: {secondsLeft}s</Text>
          </View>
        </View>

        <View style={styles.boardWrapper}>
          <Animated.View style={[styles.board, { transform: [{ translateX: boardShakeX }] }]}>
            {grid.map((row, r) => (
              <View key={`r-${r}`} style={styles.boardRow}>
                {row.map((cell, c) => {
                  const isPlayer = position.row === r && position.col === c;
                  const isGoal = goal.row === r && goal.col === c;
                  const isStart = start.row === r && start.col === c;
                  const isPainted = trail[r]?.[c] ?? false;
                  const isWallCell = cell === 'wall';

                  return (
                    <View
                      key={`c-${r}-${c}`}
                      style={[
                        styles.cell,
                        isWallCell && styles.cellWall,
                        !isWallCell && isPainted && styles.cellPainted,
                        isStart && styles.cellStart,
                        isGoal && styles.cellGoal,
                      ]}
                    >
                      {isPlayer ? (
                        <Animated.View style={[styles.playerDot, { transform: [{ scale: playerScale }] }]} />
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

          <Pressable
            onPress={reset}
            onLongPress={restartGame}
            delayLongPress={500}
            style={({ pressed }) => [
              styles.button,
              styles.controlsButtonSize,
              styles.controlsButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </Pressable>

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
    </View>
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
  introScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontSize: 14,
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
  cellStart: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  cellGoal: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  playerDot: {
    width: '58%',
    height: '58%',
    borderRadius: 999,
    backgroundColor: '#E6EEF9',
    borderWidth: 2,
    borderColor: '#0B1220',
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
  dpad: {
    marginTop: 14,
    width: '100%',
    alignItems: 'center',
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
