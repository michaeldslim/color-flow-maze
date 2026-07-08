import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar as RNStatusBar } from 'react-native';
import { getInstructionItems, getLegendForRound, gameInstructions } from '../gameInstructions';
import { getRoundLabel } from '../difficulty';
import { introStyles } from '../theme';

type Props = {
  hasResumeProgress: boolean;
  levelNumber: number;
  roundNumber: number;
  continueGame: () => void;
  startNewGame: () => void;
  bottomInset: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  moveLimitEnabled: boolean;
  onToggleMoveLimit: () => void;
  showMoveLimitToggle: boolean;
};

export default function Intro({
  hasResumeProgress,
  levelNumber,
  roundNumber,
  continueGame,
  startNewGame,
  bottomInset,
  soundEnabled,
  onToggleSound,
  moveLimitEnabled,
  onToggleMoveLimit,
  showMoveLimitToggle,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0);
  const SHIFT_UP = 15;
  const appliedTopPadding = Math.max(topPadding - SHIFT_UP, 0);
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  const instructions = gameInstructions[lang];
  const instructionItems = getInstructionItems(lang, roundNumber);
  const legendItems = getLegendForRound(lang, roundNumber);

  return (
    <SafeAreaView style={[introStyles.safeArea, { paddingTop: appliedTopPadding }]}>
      <View style={introStyles.introHeader}>
        <Text style={introStyles.title}>Color Flow Maze</Text>
        <Text style={introStyles.subtitle}>색깔 길찾기</Text>
        <Text style={introStyles.roundLabel}>{getRoundLabel(roundNumber, lang)}</Text>
      </View>

      <View style={introStyles.langToggleWrap}>
        <Pressable
          onPress={() => setLang('ko')}
          accessibilityRole="button"
          accessibilityLabel="Korean language"
          style={({ pressed }) => [
            introStyles.langChip,
            lang === 'ko' ? introStyles.langChipActive : introStyles.langChipInactive,
            pressed && introStyles.buttonPressed,
          ]}
        >
          <Text style={[introStyles.langChipText, lang === 'ko' && introStyles.langChipTextActive]}>KO</Text>
        </Pressable>

        <Pressable
          onPress={() => setLang('en')}
          accessibilityRole="button"
          accessibilityLabel="English language"
          style={({ pressed }) => [
            introStyles.langChip,
            lang === 'en' ? introStyles.langChipActive : introStyles.langChipInactive,
            pressed && introStyles.buttonPressed,
          ]}
        >
          <Text style={[introStyles.langChipText, lang === 'en' && introStyles.langChipTextActive]}>EN</Text>
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={[introStyles.introScrollContent, { paddingBottom: 40 + bottomInset }]}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
      >
        <View style={introStyles.introCard}>
          <Text style={introStyles.introSectionTitle}>{instructions.legendTitle}</Text>
          {legendItems.map((item) => (
            <View key={item.label} style={introStyles.legendRow}>
              <View style={[introStyles.legendSwatch, { backgroundColor: item.color }]} />
              <Text style={introStyles.legendLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={[introStyles.introCard, { marginTop: 12 }]}>
          <Text style={introStyles.introSectionTitle}>{instructions.title}</Text>
          {instructionItems.map((item, index) => (
            <Text key={index} style={introStyles.introText}>
              {item}
            </Text>
          ))}
        </View>

        <View style={introStyles.settingsRow}>
          <Text style={introStyles.settingsLabel}>{instructions.soundLabel}</Text>
          <Pressable
            onPress={onToggleSound}
            accessibilityRole="switch"
            accessibilityState={{ checked: soundEnabled }}
            accessibilityLabel={`${instructions.soundLabel}, ${soundEnabled ? instructions.soundOn : instructions.soundOff}`}
            style={({ pressed }) => [
              introStyles.settingsToggle,
              soundEnabled ? introStyles.settingsToggleOn : introStyles.settingsToggleOff,
              pressed && introStyles.buttonPressed,
            ]}
          >
            <Text
              style={[
                introStyles.settingsToggleText,
                soundEnabled && introStyles.settingsToggleTextOn,
              ]}
            >
              {soundEnabled ? instructions.soundOn : instructions.soundOff}
            </Text>
          </Pressable>
        </View>

        {showMoveLimitToggle ? (
          <View style={[introStyles.settingsRow, { marginTop: 8 }]}>
            <Text style={introStyles.settingsLabel}>{instructions.moveLimitLabel}</Text>
            <Pressable
              onPress={onToggleMoveLimit}
              accessibilityRole="switch"
              accessibilityState={{ checked: moveLimitEnabled }}
              accessibilityLabel={`${instructions.moveLimitLabel}, ${moveLimitEnabled ? instructions.moveLimitOn : instructions.moveLimitOff}`}
              style={({ pressed }) => [
                introStyles.settingsToggle,
                moveLimitEnabled ? introStyles.settingsToggleOn : introStyles.settingsToggleOff,
                pressed && introStyles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  introStyles.settingsToggleText,
                  moveLimitEnabled && introStyles.settingsToggleTextOn,
                ]}
              >
                {moveLimitEnabled ? instructions.moveLimitOn : instructions.moveLimitOff}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Pressable
          onPress={continueGame}
          disabled={!hasResumeProgress}
          accessibilityRole="button"
          style={({ pressed }) => [
            introStyles.primaryButton,
            introStyles.introSecondaryButton,
            !hasResumeProgress && introStyles.buttonDisabled,
            pressed && hasResumeProgress && introStyles.buttonPressed,
          ]}
        >
          <Text style={[introStyles.primaryButtonText, hasResumeProgress && introStyles.resumePrimaryButtonText]}>
            {hasResumeProgress
              ? lang === 'en'
                ? `From Level ${levelNumber}`
                : `레벨 ${levelNumber} 이어하기`
              : lang === 'en'
                ? 'Continue'
                : '이어하기'}
          </Text>
        </Pressable>

        <Pressable
          onPress={startNewGame}
          accessibilityRole="button"
          style={({ pressed }) => [introStyles.button, introStyles.introSecondaryButton, pressed && introStyles.buttonPressed]}
        >
          <Text style={introStyles.buttonText}>{lang === 'en' ? 'New Game' : '새 게임'}</Text>
        </Pressable>

        <StatusBar style="light" />
      </ScrollView>
    </SafeAreaView>
  );
}
