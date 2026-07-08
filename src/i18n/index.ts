import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en';
import ko from './locales/ko';

export const LANGUAGE_STORAGE_KEY = 'color-flow-maze:language';
export type TAppLanguage = 'ko' | 'en';

export const SUPPORTED_LANGUAGES: TAppLanguage[] = ['ko', 'en'];

const resources = {
  en: { translation: en },
  ko: { translation: ko },
};

function isAppLanguage(value: string | null | undefined): value is TAppLanguage {
  return value === 'ko' || value === 'en';
}

export async function loadSavedLanguage(): Promise<TAppLanguage> {
  try {
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isAppLanguage(saved)) return saved;
  } catch {
    // ignore
  }
  return 'ko';
}

export async function saveLanguage(lang: TAppLanguage): Promise<void> {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // best-effort
  }
}

let initPromise: Promise<void> | null = null;

export function initI18n(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const lng = await loadSavedLanguage();
    if (!i18n.isInitialized) {
      await i18n.use(initReactI18next).init({
        resources,
        lng,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
        compatibilityJSON: 'v4',
      });
      return;
    }
    await i18n.changeLanguage(lng);
  })();

  return initPromise;
}

export async function setAppLanguage(lang: TAppLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  await saveLanguage(lang);
}

export async function initI18nForTests(lng: TAppLanguage = 'en'): Promise<void> {
  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources,
      lng,
      fallbackLng: 'en',
      interpolation: { escapeValue: false },
      compatibilityJSON: 'v4',
    });
    return;
  }
  await i18n.changeLanguage(lng);
}

export default i18n;
