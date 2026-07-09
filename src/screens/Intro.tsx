import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, Text, Pressable, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar as RNStatusBar } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getInstructionItems, getLegendForRound } from '../gameInstructions';
import { getRoundLabel } from '../difficulty';
import { APP_VERSION } from '../constants';
import LangToggle from '../components/LangToggle';
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? (RNStatusBar.currentHeight ?? 0) : 0);
  const SHIFT_UP = 15;
  const appliedTopPadding = Math.max(topPadding - SHIFT_UP, 0);
  const instructionItems = getInstructionItems(roundNumber);
  const legendItems = getLegendForRound(roundNumber);

  return (
    <SafeAreaView style={[introStyles.safeArea, { paddingTop: appliedTopPadding }]}>
      <View style={introStyles.introHeader}>
        <View style={introStyles.introHeaderTopRow}>
          <View style={introStyles.introHeaderSide} />
          <View style={introStyles.introHeaderCenter}>
            <Text style={introStyles.title} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85}>
              {t('app.title')}
            </Text>
            <Text style={introStyles.subtitle} numberOfLines={1}>
              {t('app.subtitle')}
            </Text>
            <Text style={introStyles.roundLabel} numberOfLines={1}>
              {getRoundLabel(roundNumber)}
            </Text>
          </View>
          <View style={introStyles.introHeaderSide}>
            <LangToggle horizontal compact style={introStyles.introHeaderLang} />
          </View>
        </View>
      </View>

      <ScrollView
        style={introStyles.introBody}
        contentContainerStyle={[introStyles.introScrollContent, { paddingBottom: 16 }]}
        alwaysBounceVertical
        showsVerticalScrollIndicator={false}
      >
        <View style={introStyles.introCard}>
          <Text style={introStyles.introSectionTitle}>{t('intro.legendTitle')}</Text>
          <View style={introStyles.legendGrid}>
            {legendItems.map((item) => (
              <View key={item.label} style={introStyles.legendRow}>
                <View style={[introStyles.legendSwatch, { backgroundColor: item.color }]} />
                <Text style={introStyles.legendLabel} numberOfLines={2}>
                  {item.label}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[introStyles.introCard, { marginTop: 8 }]}>
          <Text style={introStyles.introSectionTitle}>{t('intro.howToPlay')}</Text>
          {instructionItems.map((item, index) => (
            <Text key={index} style={introStyles.introText}>
              {item}
            </Text>
          ))}
        </View>

        <View style={introStyles.settingsCard}>
          <View style={introStyles.settingsRow}>
            <Text style={introStyles.settingsLabel}>{t('intro.soundLabel')}</Text>
            <Pressable
              onPress={onToggleSound}
              accessibilityRole="switch"
              accessibilityState={{ checked: soundEnabled }}
              accessibilityLabel={`${t('intro.soundLabel')}, ${soundEnabled ? t('intro.soundOn') : t('intro.soundOff')}`}
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
                {soundEnabled ? t('intro.soundOn') : t('intro.soundOff')}
              </Text>
            </Pressable>
          </View>

          {showMoveLimitToggle ? (
            <View style={[introStyles.settingsRow, introStyles.settingsRowBorder]}>
              <Text style={introStyles.settingsLabel}>{t('intro.moveLimitLabel')}</Text>
              <Pressable
                onPress={onToggleMoveLimit}
                accessibilityRole="switch"
                accessibilityState={{ checked: moveLimitEnabled }}
                accessibilityLabel={`${t('intro.moveLimitLabel')}, ${moveLimitEnabled ? t('intro.moveLimitOn') : t('intro.moveLimitOff')}`}
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
                  {moveLimitEnabled ? t('intro.moveLimitOn') : t('intro.moveLimitOff')}
                </Text>
              </Pressable>
            </View>
          ) : null}
        </View>

        <Text style={introStyles.introVersion} accessibilityLabel={`Version ${APP_VERSION}`}>
          v{APP_VERSION}
        </Text>

        <StatusBar style="light" />
      </ScrollView>

      <View style={[introStyles.introFooter, { paddingBottom: Math.max(bottomInset, 12) }]}>
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
            {hasResumeProgress ? t('intro.continueFromLevel', { level: levelNumber }) : t('intro.continue')}
          </Text>
        </Pressable>

        <Pressable
          onPress={startNewGame}
          accessibilityRole="button"
          style={({ pressed }) => [introStyles.button, introStyles.introSecondaryButton, pressed && introStyles.buttonPressed]}
        >
          <Text style={introStyles.buttonText}>{t('intro.newGame')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
