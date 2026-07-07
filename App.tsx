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
  Text,
  View,
  StatusBar as RNStatusBar,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Intro from './src/screens/Intro';
import Board from './src/components/Board';
import HUD from './src/components/HUD';
import Controls from './src/components/Controls';
import LevelTransition from './src/components/LevelTransition';
import { useSoundEnabled, useMoveLimitEnabled } from './src/settings';
import { gameStyles } from './src/theme';
import { type TDirection, type TGameStatus } from './gameLogic';

function AppContent() {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 12) + 12;
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0);
  const SHIFT_UP = 15;
  const appliedTopPadding = Math.max(topPadding - SHIFT_UP, 0);

  const { soundEnabled, toggleSound } = useSoundEnabled();
  const { moveLimitEnabled, toggleMoveLimit } = useMoveLimitEnabled();

  const {
    screen,
    hasResumeProgress,
    level,
    levelNumber,
    gameCompleted,
    isProgressLoaded,
    position,
    status,
    lossReason,
    undosUsed,
    movesUsed,
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
  } = useGame({ moveLimitEnabled });

  const { grid, goal, moveLimit } = level;

  const [showFireworks, setShowFireworks] = useState<boolean>(false);
  const [showResetHintInline, setShowResetHintInline] = useState<boolean>(false);
  const [showLevelTransition, setShowLevelTransition] = useState<boolean>(false);
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
      Animated.timing(boardShakeX, { toValue: 8, duration: 40, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: -8, duration: 40, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: 6, duration: 35, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: -6, duration: 35, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(boardShakeX, { toValue: 0, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
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
    const timeoutId = setTimeout(() => setShowResetHintInline(false), 1800);
    return () => clearTimeout(timeoutId);
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
        Animated.timing(goalPulse, { toValue: 1, duration: 380, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(goalPulse, { toValue: 0, duration: 420, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );

    goalPulseLoop.start();
    return () => {
      goalPulseLoop.stop();
      goalPulse.stopAnimation();
    };
  }, [goalPulse, levelNumber, screen]);

  useEffect(() => {
    if (screen !== 'game') return;
    setShowLevelTransition(true);
    const timeoutId = setTimeout(() => setShowLevelTransition(false), 1200);
    return () => clearTimeout(timeoutId);
  }, [levelNumber, screen]);

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

  const triggerLossFeedback = async () => {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
      Animated.timing(timerPulse, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(timerPulse, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }),
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
        Animated.timing(winFlashOpacity, { toValue: 0.34, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(winFlashOpacity, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]).start();

      if (soundEnabled) {
        winPlayer.seekTo(0);
        winPlayer.play();
      }

      if (levelNumber >= MAX_LEVEL && soundEnabled) {
        setTimeout(() => {
          congratsPlayer.seekTo(0);
          congratsPlayer.play();
        }, 350);
      }
    }

    if (last !== 'lost' && status === 'lost') {
      void triggerLossFeedback();
    }

    lastStatusRef.current = status;
  }, [status, levelNumber, winFlashOpacity, soundEnabled, winPlayer, congratsPlayer]);

  useEffect(() => {
    if (status !== 'won' || gameCompleted) return;
    const id = setTimeout(() => newLevel(), 3000);
    return () => clearTimeout(id);
  }, [status, gameCompleted]);

  const handleAttemptMove = (direction: TDirection) => {
    const result = attemptMove(direction);
    if (!result) return;
    if (result.blocked) {
      shakeBoard();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      return;
    }
    if (result.didWin) {
      pulsePlayer('win');
      return;
    }
    pulsePlayer('move');
  };

  const headerText = gameCompleted
    ? 'You beat the game!'
    : status === 'won'
      ? 'Stage Clear!'
      : status === 'lost'
        ? lossReason === 'moves'
          ? 'Out of moves — tap Try Again'
          : 'Time up — tap Try Again'
        : 'Use the D-pad';

  const isLost = status === 'lost';
  const nextLabel = gameCompleted ? 'Restart' : isLost ? 'Try Again' : 'Next Level';
  const nextDisabled = !gameCompleted && !isLost && status !== 'won';
  const handleNextAction = () => {
    if (gameCompleted) {
      restartGame();
      return;
    }
    if (isLost) {
      reset();
      return;
    }
    newLevel();
  };

  const isTimerWarning = TIMER_ENABLED && status === 'playing' && secondsLeft > 0 && secondsLeft <= 10;
  const isTimerCritical = isTimerWarning && secondsLeft <= 5;

  if (!isProgressLoaded) {
    return (
      <SafeAreaView style={[gameStyles.safeArea, { paddingTop: appliedTopPadding }]}>
        <View style={[gameStyles.container, gameStyles.loadingContainer]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={gameStyles.subtitle}>Loading progress...</Text>
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
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        moveLimitEnabled={moveLimitEnabled}
        onToggleMoveLimit={toggleMoveLimit}
      />
    );
  }

  return (
    <SafeAreaView style={[gameStyles.safeArea, { paddingTop: appliedTopPadding, paddingBottom: bottomInset }]}>
      <View style={gameStyles.container}>
        <HUD
          title="Color Flow Maze"
          subtitle={headerText}
          levelNumber={levelNumber}
          maxLevel={MAX_LEVEL}
          movesUsed={movesUsed}
          moveLimit={moveLimit}
          moveLimitEnabled={moveLimitEnabled}
          timerEnabled={TIMER_ENABLED}
          secondsLeft={secondsLeft}
          isTimerWarning={isTimerWarning}
          isTimerCritical={isTimerCritical}
          timerPulse={timerPulse}
        />

        <View style={gameStyles.boardWrapper}>
          <View style={gameStyles.boardSlot}>
            <Board
              grid={grid}
              position={position}
              trail={trail}
              goal={goal}
              playerScale={playerScale}
              goalPulse={goalPulse}
              boardShakeX={boardShakeX}
              winFlashOpacity={winFlashOpacity}
            />
            <LevelTransition levelNumber={levelNumber} visible={showLevelTransition && status === 'playing'} />
          </View>
        </View>

        <Controls
          attemptMove={handleAttemptMove}
          status={status}
          undo={undo}
          undoDisabled={(!isLost && status !== 'playing') || history.length === 0 || undosUsed >= UNDO_LIMIT}
          undoCountRemaining={Math.max(0, UNDO_LIMIT - undosUsed)}
          showUndo
          handleResetPress={handleResetPress}
          handleResetLongPress={handleResetLongPress}
          showResetHintInline={showResetHintInline}
          onNextLevel={handleNextAction}
          nextDisabled={nextDisabled}
          nextLabel={nextLabel}
          nextHighlighted={isLost}
        />

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
