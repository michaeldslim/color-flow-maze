import { useEffect, useMemo, useState } from 'react';
import {
  cloneTrail,
  createTrail,
  generateLevel,
  inBounds,
  isBlocked,
  slide,
  positionsEqual,
  directionVector,
  type TDirection,
  type TGameSnapshot,
  type TGameStatus,
  type TLevel,
  type TPosition,
} from '../gameLogic';
import { loadSavedProgress, saveSavedProgress, type TSavedInLevelProgress, type TSavedProgress } from './persistence';
import { clampRoundNumber, getDifficultyProfile, getLevelTimerSeconds, getMaxLevel, getNextRound, getRoundConfig } from './difficulty';

export type TScreen = 'intro' | 'game';
export type TLossReason = 'time' | 'moves' | null;

type UseGameOptions = {
  moveLimitEnabled?: boolean;
};

export function useGame(options: UseGameOptions = {}) {
  const moveLimitSettingEnabled = options.moveLimitEnabled ?? false;

  const [screen, setScreen] = useState<TScreen>('intro');
  const [hasResumeProgress, setHasResumeProgress] = useState<boolean>(false);

  const [roundNumber, setRoundNumber] = useState<number>(1);
  const [roundsCompleted, setRoundsCompleted] = useState<number>(0);
  const [levelNumber, setLevelNumber] = useState<number>(1);
  const [levelSeeds, setLevelSeeds] = useState<number[]>(() => [Date.now() >>> 0]);
  const [gameCompleted, setGameCompleted] = useState<boolean>(false);
  const [isProgressLoaded, setIsProgressLoaded] = useState<boolean>(false);

  const roundConfig = useMemo(() => getRoundConfig(roundNumber), [roundNumber]);
  const moveLimitEnabled = roundConfig.enforceMoveLimit || (roundNumber === 1 && moveLimitSettingEnabled);
  const levelTimeSeconds = getLevelTimerSeconds(roundNumber, levelNumber);

  const currentSeed = levelSeeds[levelNumber - 1] ?? (Date.now() >>> 0);
  const level: TLevel = useMemo(
    () => generateLevel(levelNumber, currentSeed, { iceStops: roundConfig.mechanics.iceStops }),
    [levelNumber, currentSeed, roundConfig.mechanics.iceStops],
  );

  const { grid, start, goal } = level;
  const rows = grid.length;
  const cols = grid[0]?.length ?? 0;

  const [position, setPosition] = useState<TPosition>(start);
  const [movesUsed, setMovesUsed] = useState<number>(0);
  const [status, setStatus] = useState<TGameStatus>('playing');
  const [undosUsed, setUndosUsed] = useState<number>(0);
  const [secondsLeft, setSecondsLeft] = useState<number>(levelTimeSeconds);
  const [trail, setTrail] = useState<boolean[][]>(() => {
    const t = createTrail(rows, cols);
    t[start.row][start.col] = true;
    return t;
  });
  const [history, setHistory] = useState<TGameSnapshot[]>([]);
  const [lossReason, setLossReason] = useState<TLossReason>(null);
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

      const roundNumber = clampRoundNumber(saved.roundNumber);
      const maxLevel = getMaxLevel(roundNumber);
      const levelNumber = Math.min(saved.levelNumber, maxLevel);
      const gameCompleted = saved.gameCompleted || (roundNumber === 1 && saved.levelNumber > maxLevel);

      setHasResumeProgress(
        saved.screen === 'game' || levelNumber > 1 || gameCompleted || saved.inLevelProgress != null,
      );
      setRoundNumber(roundNumber);
      setRoundsCompleted(saved.roundsCompleted);
      setLevelSeeds(saved.levelSeeds);
      setLevelNumber(levelNumber);
      setGameCompleted(gameCompleted);
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
        schemaVersion: 2,
        roundNumber,
        roundsCompleted,
        difficultyProfile: getDifficultyProfile(roundNumber),
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
    roundNumber,
    roundsCompleted,
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
    if (!roundConfig.timerEnabled) return;
    if (gameCompleted) return;
    if (status !== 'playing') return;
    if (secondsLeft <= 0) return;

    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setStatus('lost');
          setLossReason('time');
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => clearInterval(id);
  }, [status, secondsLeft, gameCompleted, roundConfig.timerEnabled]);

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
        setUndosUsed(Math.min(roundConfig.undoLimit, Math.max(0, pendingInLevelRestore.undosUsed)));
        setSecondsLeft(Math.min(levelTimeSeconds, Math.max(0, pendingInLevelRestore.secondsLeft)));
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
    setLossReason(null);
    setUndosUsed(0);
    setSecondsLeft(levelTimeSeconds);
    setHistory([]);
    setTrail(() => {
      const t = createTrail(rows, cols);
      t[start.row][start.col] = true;
      return t;
    });
  }, [pendingInLevelRestore, levelNumber, rows, cols, start.row, start.col, grid, roundConfig.undoLimit, levelTimeSeconds]);

  const pushHistory = (snapshot: TGameSnapshot) => {
    setHistory((prev) => [snapshot, ...prev].slice(0, 200));
  };

  const reset = () => {
    setPosition(start);
    setMovesUsed(0);
    setStatus('playing');
    setLossReason(null);
    setUndosUsed(0);
    setSecondsLeft(levelTimeSeconds);
    setHistory([]);
    setTrail(() => {
      const t = createTrail(rows, cols);
      t[start.row][start.col] = true;
      return t;
    });
  };

  const newLevel = () => {
    if (levelNumber >= roundConfig.maxLevel) return;
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
    setRoundNumber(1);
    setGameCompleted(false);
    setLevelSeeds([seed]);
    setLevelNumber(1);
    setPendingInLevelRestore(null);
    setHasResumeProgress(true);
  };

  const replayCurrentRound = () => {
    const seed = Date.now() >>> 0;
    setGameCompleted(false);
    setLevelSeeds([seed]);
    setLevelNumber(1);
    setPendingInLevelRestore(null);
    setHasResumeProgress(true);
    setScreen('game');
  };

  const advanceRound = () => {
    const seed = Date.now() >>> 0;
    const nextRound = getNextRound(roundNumber);
    setRoundNumber(nextRound);
    setGameCompleted(false);
    setLevelSeeds([seed]);
    setLevelNumber(1);
    setPendingInLevelRestore(null);
    setHasResumeProgress(true);
    setScreen('game');
  };

  /** @deprecated Use advanceRound */
  const startChallengeRound = advanceRound;

  const continueGame = () => setScreen('game');
  const startNewGame = () => {
    restartGame();
    setScreen('game');
  };

  const backToIntro = () => setScreen('intro');

  const undo = () => {
    if (undosUsed >= roundConfig.undoLimit) return;
    setHistory((prev) => {
      const [latest, ...rest] = prev;
      if (!latest) return prev;
      setPosition(latest.position);
      setMovesUsed(latest.movesUsed);
      setStatus(latest.status);
      setLossReason(null);
      setTrail(latest.trail);
      setUndosUsed((u) => u + 1);
      return rest;
    });
  };

  const attemptMove = (direction: TDirection): { blocked: boolean; didWin?: boolean; newPosition?: TPosition } => {
    if (status !== 'playing') return { blocked: true };
    if (roundConfig.timerEnabled && secondsLeft <= 0) return { blocked: true };

    const { dr, dc } = directionVector(direction as TDirection);

    const dest = slide(grid, position, direction as TDirection, {
      iceStops: roundConfig.mechanics.iceStops,
    });
    if (positionsEqual(dest, position)) return { blocked: true };

    pushHistory({ position, movesUsed, status, trail: cloneTrail(trail) });

    const nextTrail = cloneTrail(trail);
    let curMark = { ...position };
    while (!positionsEqual(curMark, dest)) {
      curMark = { row: curMark.row + dr, col: curMark.col + dc };
      nextTrail[curMark.row][curMark.col] = true;
    }

    const newMovesUsed = movesUsed + 1;
    const didWin = positionsEqual(dest, goal);

    setPosition(dest);
    setTrail(nextTrail);
    setMovesUsed(newMovesUsed);

    if (didWin) {
      setStatus('won');
      if (levelNumber >= roundConfig.maxLevel) {
        setGameCompleted(true);
        setRoundsCompleted((r) => r + 1);
      }
    } else if (moveLimitEnabled && newMovesUsed >= level.moveLimit) {
      setStatus('lost');
      setLossReason('moves');
    }

    return { blocked: false, didWin, newPosition: dest };
  };

  return {
    screen,
    setScreen,
    hasResumeProgress,
    roundNumber,
    roundsCompleted,
    roundConfig,
    moveLimitEnabled,
    levelTimeSeconds,
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
    lossReason,
    pushHistory,
    reset,
    newLevel,
    restartGame,
    replayCurrentRound,
    advanceRound,
    startChallengeRound,
    continueGame,
    startNewGame,
    backToIntro,
    undo,
    attemptMove,
  } as const;
}

export default useGame;
