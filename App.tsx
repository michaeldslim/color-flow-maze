import { StatusBar } from 'expo-status-bar';
import React, { useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StatusBar as RNStatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type TCell = 'empty' | 'wall' | 'start' | 'goal';

type TDirection = 'up' | 'down' | 'left' | 'right';

type TGameStatus = 'playing' | 'won' | 'lost';

type TPosition = {
  row: number;
  col: number;
};

type TGameSnapshot = {
  position: TPosition;
  movesUsed: number;
  status: TGameStatus;
  trail: boolean[][];
};

type TScreen = 'intro' | 'game';

type TLevel = {
  grid: TCell[][];
  start: TPosition;
  goal: TPosition;
  moveLimit: number;
};

const DEFAULT_MOVE_LIMIT = 10;

const MAX_LEVEL = 50;

const UNDO_LIMIT = 3;

const LEVEL_TIME_SECONDS = 60;

const TIMER_ENABLED = false;

const SWIPE_THRESHOLD_PX = 20;

function parseLevel(raw: string[]): {
  grid: TCell[][];
  start: TPosition;
  goal: TPosition;
} {
  const grid: TCell[][] = [];
  let start: TPosition | null = null;
  let goal: TPosition | null = null;

  for (let r = 0; r < raw.length; r += 1) {
    const rowStr = raw[r] ?? '';
    const row: TCell[] = [];

    for (let c = 0; c < rowStr.length; c += 1) {
      const ch = rowStr[c];
      if (ch === '#') {
        row.push('wall');
      } else if (ch === 'S') {
        row.push('start');
        start = { row: r, col: c };
      } else if (ch === 'G') {
        row.push('goal');
        goal = { row: r, col: c };
      } else {
        row.push('empty');
      }
    }

    grid.push(row);
  }

  if (!start || !goal) {
    throw new Error('Invalid level: missing start or goal');
  }

  return { grid, start, goal };
}

function createTrail(rows: number, cols: number): boolean[][] {
  return Array.from({ length: rows }, () => Array.from({ length: cols }, () => false));
}

function randomInt(minInclusive: number, maxInclusive: number): number {
  const min = Math.ceil(minInclusive);
  const max = Math.floor(maxInclusive);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

type TRng = {
  nextFloat: () => number;
};

function createSeededRng(seed: number): TRng {
  let state = seed >>> 0;
  return {
    nextFloat: () => {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    },
  };
}

function randomIntWithRng(rng: TRng, minInclusive: number, maxInclusive: number): number {
  const min = Math.ceil(minInclusive);
  const max = Math.floor(maxInclusive);
  return Math.floor(rng.nextFloat() * (max - min + 1)) + min;
}

function pickRandomEmptyCell(grid: TCell[][]): TPosition {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let attempts = 0; attempts < 5000; attempts += 1) {
    const row = randomInt(1, rows - 2);
    const col = randomInt(1, cols - 2);
    if (grid[row]?.[col] !== 'wall') return { row, col };
  }
  return { row: 1, col: 1 };
}

function pickRandomEmptyCellWithRng(grid: TCell[][], rng: TRng): TPosition {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let attempts = 0; attempts < 5000; attempts += 1) {
    const row = randomIntWithRng(rng, 1, rows - 2);
    const col = randomIntWithRng(rng, 1, cols - 2);
    if (grid[row]?.[col] !== 'wall') return { row, col };
  }
  return { row: 1, col: 1 };
}

function slide(grid: TCell[][], from: TPosition, direction: TDirection): TPosition {
  const { dr, dc } = directionVector(direction);
  let cur: TPosition = from;
  let next: TPosition = { row: cur.row + dr, col: cur.col + dc };
  if (isBlocked(grid, next)) return from;

  while (!isBlocked(grid, next)) {
    cur = next;
    next = { row: cur.row + dr, col: cur.col + dc };
  }

  return cur;
}

function isStoppableCell(grid: TCell[][], pos: TPosition): boolean {
  if (!inBounds(grid, pos)) return false;
  if (grid[pos.row]?.[pos.col] === 'wall') return false;
  const candidates: TPosition[] = [
    { row: pos.row - 1, col: pos.col },
    { row: pos.row + 1, col: pos.col },
    { row: pos.row, col: pos.col - 1 },
    { row: pos.row, col: pos.col + 1 },
  ];
  return candidates.some((p) => isBlocked(grid, p));
}

function pickRandomStoppableCellWithRng(grid: TCell[][], rng: TRng): TPosition {
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;
  for (let attempts = 0; attempts < 8000; attempts += 1) {
    const row = randomIntWithRng(rng, 1, rows - 2);
    const col = randomIntWithRng(rng, 1, cols - 2);
    const pos = { row, col };
    if (grid[row]?.[col] === 'wall') continue;
    if (!isStoppableCell(grid, pos)) continue;
    return pos;
  }
  return pickRandomEmptyCellWithRng(grid, rng);
}

function minMovesToGoal(grid: TCell[][], start: TPosition, goal: TPosition, moveLimit: number): number | null {
  const encode = (p: TPosition) => `${p.row},${p.col}`;

  const visited = new Set<string>();
  const queue: Array<{ pos: TPosition; dist: number }> = [{ pos: start, dist: 0 }];
  visited.add(encode(start));

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    if (positionsEqual(item.pos, goal)) return item.dist;
    if (item.dist >= moveLimit) continue;

    const nextPositions: TPosition[] = [
      slide(grid, item.pos, 'up'),
      slide(grid, item.pos, 'down'),
      slide(grid, item.pos, 'left'),
      slide(grid, item.pos, 'right'),
    ];

    for (const np of nextPositions) {
      const key = encode(np);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ pos: np, dist: item.dist + 1 });
    }
  }

  return null;
}

function generateLevel(levelNumber: number, seed: number): TLevel {
  const size = Math.min(12, 8 + Math.floor((levelNumber - 1) / 2));
  const moveLimit = Math.max(6, DEFAULT_MOVE_LIMIT - Math.floor((levelNumber - 1) / 4));
  const wallProbability = Math.min(0.26, 0.12 + (levelNumber - 1) * 0.01);

  const rng = createSeededRng(seed ^ (levelNumber * 2654435761));

  for (let attempts = 0; attempts < 200; attempts += 1) {
    const grid: TCell[][] = Array.from({ length: size }, (_r, r) =>
      Array.from({ length: size }, (_c, c) => {
        if (r === 0 || c === 0 || r === size - 1 || c === size - 1) return 'wall';
        return rng.nextFloat() < wallProbability ? 'wall' : 'empty';
      }),
    );

    const start = pickRandomEmptyCellWithRng(grid, rng);
    const goal = pickRandomStoppableCellWithRng(grid, rng);
    if (positionsEqual(start, goal)) continue;

    grid[start.row][start.col] = 'start';
    grid[goal.row][goal.col] = 'goal';

    const minMoves = minMovesToGoal(grid, start, goal, moveLimit);
    if (minMoves === null) continue;
    if (minMoves < 2) continue;

    return { grid, start, goal, moveLimit };
  }

  const fallback = parseLevel([
    '########',
    '#S.....#',
    '#.###..#',
    '#...#..#',
    '#.###..#',
    '#......#',
    '#.....G#',
    '########',
  ]);
  return { ...fallback, moveLimit: DEFAULT_MOVE_LIMIT };
}

function directionVector(direction: TDirection): { dr: number; dc: number } {
  switch (direction) {
    case 'up':
      return { dr: -1, dc: 0 };
    case 'down':
      return { dr: 1, dc: 0 };
    case 'left':
      return { dr: 0, dc: -1 };
    case 'right':
      return { dr: 0, dc: 1 };
  }
}

function positionsEqual(a: TPosition, b: TPosition): boolean {
  return a.row === b.row && a.col === b.col;
}

function inBounds(grid: TCell[][], pos: TPosition): boolean {
  return pos.row >= 0 && pos.row < grid.length && pos.col >= 0 && pos.col < (grid[0]?.length ?? 0);
}

function isBlocked(grid: TCell[][], pos: TPosition): boolean {
  if (!inBounds(grid, pos)) return true;
  return grid[pos.row]?.[pos.col] === 'wall';
}

function cloneTrail(trail: boolean[][]): boolean[][] {
  return trail.map((row) => row.slice());
}

function swipeToDirection(dx: number, dy: number): TDirection | null {
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);
  if (absX < SWIPE_THRESHOLD_PX && absY < SWIPE_THRESHOLD_PX) return null;

  if (absX > absY) {
    return dx > 0 ? 'right' : 'left';
  }
  return dy > 0 ? 'down' : 'up';
}

export default function App() {
  const topInset = Platform.OS === 'android' ? RNStatusBar.currentHeight ?? 0 : 0;
  const bottomInset = Platform.OS === 'ios' ? 48 : 32;

  const [screen, setScreen] = useState<TScreen>('intro');

  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [levelSeeds, setLevelSeeds] = useState<number[]>(() => [Date.now() >>> 0]);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);

  const lastStatusRef = useRef<TGameStatus>('playing');

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
      const importer = Function('return import("expo-haptics")') as () => Promise<any>;
      const Haptics = await importer();
      if (typeof Haptics.isAvailableAsync === 'function') {
        const available = await Haptics.isAvailableAsync();
        if (!available) return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // ignore
    }
  };

  const currentSeed = levelSeeds[levelNumber - 1] ?? (Date.now() >>> 0);
  const level = useMemo(() => generateLevel(levelNumber, currentSeed), [levelNumber, currentSeed]);
  const { grid, start, goal, moveLimit } = level;

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

  const movesLeft = Math.max(0, moveLimit - movesUsed);

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
    const last = lastStatusRef.current;
    if (last !== 'won' && status === 'won') {
      void triggerWinFeedback();
    }
    lastStatusRef.current = status;
  }, [status]);

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
    if (movesLeft <= 0) return;
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
    const didLose = !didWin && newMovesUsed >= moveLimit;

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
    setStatus(didLose ? 'lost' : 'playing');
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        return (
          Math.abs(gestureState.dx) > SWIPE_THRESHOLD_PX ||
          Math.abs(gestureState.dy) > SWIPE_THRESHOLD_PX
        );
      },
      onPanResponderRelease: (_evt, gestureState) => {
        const dir = swipeToDirection(gestureState.dx, gestureState.dy);
        if (!dir) return;
        attemptMove(dir);
      },
    }),
  ).current;

  const headerText =
    gameCompleted
      ? 'You beat the game!'
      : status === 'won'
        ? 'You won!'
      : status === 'lost'
        ? 'Out of moves'
        : 'Swipe to slide';

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
            <Text style={styles.introText}>- 스와이프하거나 방향 버튼을 누르세요.</Text>
            <Text style={styles.introText}>- 벽에 부딪힐 때까지 미끄러집니다.</Text>
            <Text style={styles.introText}>- 금색 칸에 “멈춰야” 승리합니다.</Text>
            <Text style={styles.introText}>- 50레벨을 클리어하면 게임을 완료합니다.</Text>
            <Text style={styles.introText}>- 레벨마다 이동/되돌리기 횟수가 제한됩니다.</Text>
            <Text style={styles.introText}>- Reset 버튼을 길게 누르면 게임이 처음부터 다시 시작됩니다.</Text>

            <View style={styles.introDivider} />

            <Text style={styles.introSectionTitle}>How to play</Text>
            <Text style={styles.introText}>- Swipe or press the arrow buttons.</Text>
            <Text style={styles.introText}>- You slide until you hit a wall.</Text>
            <Text style={styles.introText}>- You win only if you STOP on the gold tile.</Text>
            <Text style={styles.introText}>- Beat Level 50 to finish the game.</Text>
            <Text style={styles.introText}>- Limited moves and undos each level.</Text>
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
            <Text style={styles.hudText}>Moves: {movesUsed}/{moveLimit}</Text>
          </View>
        </View>

        <View style={styles.boardWrapper} {...panResponder.panHandlers}>
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
