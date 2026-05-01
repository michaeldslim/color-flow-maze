import { useEffect, useMemo, useState } from 'react';
import {
  cloneTrail,
  createTrail,
  generateLevel,
  inBounds,
  isBlocked,
  positionsEqual,
  directionVector,
  type TDirection,
  type TGameSnapshot,
  type TGameStatus,
  type TLevel,
  type TPosition,
} from '../gameLogic';
import { loadSavedProgress, saveSavedProgress, type TSavedInLevelProgress, type TSavedProgress } from './persistence';
import { MAX_LEVEL, UNDO_LIMIT, LEVEL_TIME_SECONDS, TIMER_ENABLED } from './constants';

export type TScreen = 'intro' | 'game';

export function useGame() {
  const [screen, setScreen] = useState<TScreen>('intro');
  const [hasResumeProgress, setHasResumeProgress] = useState<boolean>(false);

  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [levelSeeds, setLevelSeeds] = useState<number[]>(() => [Date.now() >>> 0]);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [isProgressLoaded, setIsProgressLoaded] = useState<boolean>(false);

  const currentSeed = levelSeeds[levelNumber - 1] ?? (Date.now() >>> 0);
  const level: TLevel = useMemo(() => generateLevel(levelNumber, currentSeed), [levelNumber, currentSeed]);

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const saved = await loadSavedProgress();
      if (!saved) {
        if (!cancelled) setIsProgressLoaded(true);
        return;
      }

      if (cancelled) return;

      setHasResumeProgress(
        saved.screen === 'game' || saved.levelNumber > 1 || saved.gameCompleted || saved.inLevelProgress != null,
      );
      setLevelSeeds(saved.levelSeeds);
      setLevelNumber(saved.levelNumber);
      setGameCompleted(saved.gameCompleted);
      setPendingInLevelRestore(saved.screen === 'game' ? saved.inLevelProgress ?? null : null);

      if (!cancelled) setIsProgressLoaded(true);
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isProgressLoaded) return;
    if (pendingInLevelRestore) return;
    if (screen === 'intro' && hasResumeProgress) return;

    const saveProgress = async () => {
      const payload: TSavedProgress = {
        schemaVersion: 1,
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

      await saveSavedProgress(payload);
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

    return () => clearInterval(id);
  }, [status, secondsLeft, gameCompleted]);

  useEffect(() => {
    if (pendingInLevelRestore) {
      const restoredPosition = pendingInLevelRestore.position;
      const hasValidPosition = inBounds(grid, restoredPosition) && !isBlocked(grid, restoredPosition);
      const hasValidTrail = pendingInLevelRestore.trail.length === rows && pendingInLevelRestore.trail.every((r) => r.length === cols);
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
    setPendingInLevelRestore(null);
    setHasResumeProgress(true);
  };

  const continueGame = () => setScreen('game');
  const startNewGame = () => {
    restartGame();
    setScreen('game');
  };

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

  const attemptMove = (direction: TDirection): { blocked: boolean; didWin?: boolean; newPosition?: TPosition } => {
    if (status !== 'playing') return { blocked: true };
    if (TIMER_ENABLED && secondsLeft <= 0) return { blocked: true };

    const { dr, dc } = directionVector(direction as TDirection);

    let cur: TPosition = position;
    let next: TPosition = { row: cur.row + dr, col: cur.col + dc };
    if (isBlocked(grid, next)) {
      return { blocked: true };
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
      setStatus('won');
      if (levelNumber >= MAX_LEVEL) setGameCompleted(true);
    }

    return { blocked: false, didWin, newPosition: cur };
  };

  return {
    screen,
    setScreen,
    hasResumeProgress,
    level,
    levelNumber,
    setLevelNumber,
    levelSeeds,
    setLevelSeeds,
    gameCompleted,
    setGameCompleted,
    isProgressLoaded,
    position,
    setPosition,
    movesUsed,
    setMovesUsed,
    status,
    setStatus,
    undosUsed,
    setUndosUsed,
    secondsLeft,
    setSecondsLeft,
    trail,
    setTrail,
    history,
    pushHistory,
    reset,
    newLevel,
    restartGame,
    continueGame,
    startNewGame,
    undo,
    attemptMove,
  } as const;
}

export default useGame;
