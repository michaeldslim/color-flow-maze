import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { setAppLanguage, type TAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';
import { introStyles } from '../theme';

type Props = {
  style?: object;
  compact?: boolean;
  horizontal?: boolean;
};

export default function LangToggle({ style, compact = false, horizontal = false }: Props) {
  const { i18n, t } = useTranslation();
  const current = (i18n.language === 'en' ? 'en' : 'ko') as TAppLanguage;

  const handleSelect = (lang: TAppLanguage) => {
    if (lang === current) return;
    void setAppLanguage(lang);
  };

  return (
    <View style={[introStyles.langToggleWrap, horizontal && introStyles.langToggleWrapHorizontal, style]}>
      {SUPPORTED_LANGUAGES.map((code) => (
        <Pressable
          key={code}
          onPress={() => handleSelect(code)}
          accessibilityRole="button"
          accessibilityLabel={t(`lang.${code}`)}
          style={({ pressed }) => [
            introStyles.langChip,
            compact && introStyles.langChipCompact,
            current === code ? introStyles.langChipActive : introStyles.langChipInactive,
            pressed && introStyles.buttonPressed,
          ]}
        >
          <Text style={[introStyles.langChipText, current === code && introStyles.langChipTextActive]}>
            {code.toUpperCase()}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
