import { StatusBar } from 'expo-status-bar';
import { setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import Fireworks from './Fireworks';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useGame from './src/useGame';
import { getRoundCompleteTitle } from './src/difficulty';
import { initI18n } from './src/i18n';
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
import RoundCompleteModal from './src/components/RoundCompleteModal';
import { useSoundEnabled, useMoveLimitEnabled } from './src/settings';
import { gameStyles } from './src/theme';
import { type TDirection, type TGameStatus } from './gameLogic';

function AppContent() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 12) + 12;
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0);
  const SHIFT_UP = 15;
  const appliedTopPadding = Math.max(topPadding - SHIFT_UP, 0);

  const { soundEnabled, toggleSound } = useSoundEnabled();
  const { moveLimitEnabled: moveLimitSettingEnabled, toggleMoveLimit } = useMoveLimitEnabled();

  const {
    screen,
    hasResumeProgress,
    roundNumber,
    roundsCompleted,
    roundConfig,
    moveLimitEnabled,
    levelTimeSeconds,
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
    replayCurrentRound,
    advanceRound,
    continueGame,
    startNewGame,
    backToIntro,
    undo,
    attemptMove,
  } = useGame({ moveLimitEnabled: moveLimitSettingEnabled });

  const { grid, goal, moveLimit } = level;
  const { undoLimit, timerEnabled, showUndo, maxLevel } = roundConfig;

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
  const boardFadeOpacity = useRef(new Animated.Value(1)).current;
  const pendingBoardFadeRef = useRef<boolean>(false);
  const lastTimerWarningHapticRef = useRef<number>(levelTimeSeconds + 1);
  const hasShownResetHintInlineRef = useRef<boolean>(false);
  const didTriggerResetLongPressRef = useRef<boolean>(false);

  const fadeInBoard = () => {
    boardFadeOpacity.stopAnimation();
    boardFadeOpacity.setValue(0);
    Animated.timing(boardFadeOpacity, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const goToNextLevel = useCallback(() => {
    if (levelNumber >= maxLevel) return;
    pendingBoardFadeRef.current = true;
    newLevel();
  }, [levelNumber, maxLevel, newLevel]);

  useLayoutEffect(() => {
    if (!pendingBoardFadeRef.current) return;
    pendingBoardFadeRef.current = false;
    fadeInBoard();
  }, [levelNumber]);

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
    if (!timerEnabled) return;

    const shouldWarn = screen === 'game' && status === 'playing' && secondsLeft > 0 && secondsLeft <= 10;
    if (!shouldWarn) {
      timerPulse.stopAnimation();
      timerPulse.setValue(0);
      lastTimerWarningHapticRef.current = levelTimeSeconds + 1;
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
  }, [screen, status, secondsLeft, timerPulse, timerEnabled, levelTimeSeconds]);

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

      if (levelNumber >= maxLevel && soundEnabled) {
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
    const id = setTimeout(() => goToNextLevel(), 1500);
    return () => clearTimeout(id);
  }, [status, gameCompleted, goToNextLevel]);

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
    ? getRoundCompleteTitle(roundNumber)
    : status === 'won'
      ? t('game.stageClear')
      : status === 'lost'
        ? lossReason === 'moves'
          ? t('game.outOfMoves')
          : t('game.timeUp')
        : t('game.useDpad');

  const isLost = status === 'lost';
  const nextLabel = isLost ? t('game.tryAgain') : t('game.nextLevel');
  const nextDisabled = !isLost && status !== 'won';
  const handleNextAction = () => {
    if (isLost) {
      reset();
      return;
    }
    goToNextLevel();
  };

  const isTimerWarning = timerEnabled && status === 'playing' && secondsLeft > 0 && secondsLeft <= 10;
  const isTimerCritical = isTimerWarning && secondsLeft <= 5;

  if (!isProgressLoaded) {
    return (
      <SafeAreaView style={[gameStyles.safeArea, { paddingTop: appliedTopPadding }]}>
        <View style={[gameStyles.container, gameStyles.loadingContainer]}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={gameStyles.subtitle}>{t('app.loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (screen === 'intro') {
    return (
      <Intro
        hasResumeProgress={hasResumeProgress}
        levelNumber={levelNumber}
        roundNumber={roundNumber}
        continueGame={continueGame}
        startNewGame={startNewGame}
        bottomInset={bottomInset}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        moveLimitEnabled={moveLimitSettingEnabled}
        onToggleMoveLimit={toggleMoveLimit}
        showMoveLimitToggle={roundNumber === 1}
      />
    );
  }

  return (
    <SafeAreaView style={[gameStyles.safeArea, { paddingTop: appliedTopPadding, paddingBottom: bottomInset }]}>
      <View style={gameStyles.container}>
        <HUD
          title={t('app.title')}
          subtitle={headerText}
          levelNumber={levelNumber}
          maxLevel={maxLevel}
          movesUsed={movesUsed}
          moveLimit={moveLimit}
          moveLimitEnabled={moveLimitEnabled}
          timerEnabled={timerEnabled}
          secondsLeft={secondsLeft}
          isTimerWarning={isTimerWarning}
          isTimerCritical={isTimerCritical}
          timerPulse={timerPulse}
        />

        <View style={gameStyles.boardWrapper}>
          <View style={gameStyles.boardSlot}>
            <Animated.View style={[gameStyles.boardFadeWrap, { opacity: boardFadeOpacity }]}>
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
            </Animated.View>
          </View>
        </View>

        <Controls
          attemptMove={handleAttemptMove}
          status={status}
          undo={undo}
          undoDisabled={(!isLost && status !== 'playing') || history.length === 0 || undosUsed >= undoLimit}
          undoCountRemaining={Math.max(0, undoLimit - undosUsed)}
          showUndo={showUndo}
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
        <RoundCompleteModal
          visible={gameCompleted}
          roundNumber={roundNumber}
          roundsCompleted={roundsCompleted}
          onAdvanceRound={advanceRound}
          onPlayAgain={roundNumber === 1 ? restartGame : replayCurrentRound}
          onBackToIntro={backToIntro}
        />
      </View>
    </SafeAreaView>
  );
}

export default function App() {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    void initI18n().then(() => setI18nReady(true));
  }, []);

  if (!i18nReady) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={gameStyles.safeArea}>
          <View style={[gameStyles.container, gameStyles.loadingContainer]}>
            <ActivityIndicator size="large" color="#ffffff" />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
