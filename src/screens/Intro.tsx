import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type Props = {
  hasResumeProgress: boolean;
  levelNumber: number;
  continueGame: () => void;
  startNewGame: () => void;
  bottomInset: number;
};

export default function Intro({ hasResumeProgress, levelNumber, continueGame, startNewGame, bottomInset }: Props) {
  const [lang, setLang] = useState<'ko' | 'en'>('ko');
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.introHeader}>
        <Text style={styles.title}>Color Flow Maze</Text>
        <Text style={styles.subtitle}>색깔 길찾기</Text>
      </View>

      <View style={styles.langToggleWrap}>
        <Pressable
          onPress={() => setLang('ko')}
          style={({ pressed }) => [
            styles.langChip,
            lang === 'ko' ? styles.langChipActive : styles.langChipInactive,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.langChipText, lang === 'ko' && styles.langChipTextActive]}>KO</Text>
        </Pressable>

        <Pressable
          onPress={() => setLang('en')}
          style={({ pressed }) => [
            styles.langChip,
            lang === 'en' ? styles.langChipActive : styles.langChipInactive,
            pressed && styles.buttonPressed,
          ]}
        >
          <Text style={[styles.langChipText, lang === 'en' && styles.langChipTextActive]}>EN</Text>
        </Pressable>
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
          {lang === 'ko' ? (
            <>
              <Text style={styles.introSectionTitle}>플레이 방법</Text>
              <Text style={styles.introText}>- 방향 버튼을 누르세요.</Text>
              <Text style={styles.introText}>- 벽에 부딪힐 때까지 미끄러집니다.</Text>
              <Text style={styles.introText}>- 오렌지색 칸에 “멈춰야” 승리합니다.</Text>
              <Text style={styles.introText}>- 50레벨을 클리어하면 게임을 완료합니다.</Text>
              <Text style={styles.introText}>- Reset 버튼을 길게 누르면 게임이 처음부터 다시 시작됩니다.</Text>
            </>
          ) : (
            <>
              <Text style={styles.introSectionTitle}>How to play</Text>
              <Text style={styles.introText}>- Press the arrow buttons.</Text>
              <Text style={styles.introText}>- You slide until you hit a wall.</Text>
              <Text style={styles.introText}>- You win only if you STOP on the orange tile.</Text>
              <Text style={styles.introText}>- Beat Level 50 to finish the game.</Text>
              <Text style={styles.introText}>- Long-press Reset to restart the whole game.</Text>
            </>
          )}
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
          style={({ pressed }) => [styles.button, styles.introSecondaryButton, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>{lang === 'en' ? 'New Game' : '새 게임'}</Text>
        </Pressable>

        <StatusBar style="auto" />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  introHeader: {
    paddingHorizontal: 16,
    alignItems: 'center',
    paddingBottom: 8,
  },
  introScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'flex-start',
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
    marginTop: 36,
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
  langToggleWrap: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  langChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 56,
    alignItems: 'center',
  },
  langChipActive: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  langChipInactive: {
    backgroundColor: 'transparent',
    borderColor: '#2B3B63',
  },
  langChipText: {
    color: '#E6EEF9',
    fontWeight: '800',
  },
  langChipTextActive: {
    color: '#FFFFFF',
  },
});
