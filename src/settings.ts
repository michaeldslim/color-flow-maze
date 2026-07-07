import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export const SOUND_ENABLED_KEY = 'color-flow-maze:sound-enabled';
export const MOVE_LIMIT_ENABLED_KEY = 'color-flow-maze:move-limit-enabled';

async function loadBoolSetting(key: string, defaultValue: boolean): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return defaultValue;
    return raw === 'true';
  } catch {
    return defaultValue;
  }
}

async function saveBoolSetting(key: string, enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(key, enabled ? 'true' : 'false');
  } catch {
    // best-effort
  }
}

export async function loadSoundEnabled(): Promise<boolean> {
  return loadBoolSetting(SOUND_ENABLED_KEY, true);
}

export async function saveSoundEnabled(enabled: boolean): Promise<void> {
  await saveBoolSetting(SOUND_ENABLED_KEY, enabled);
}

export async function loadMoveLimitEnabled(): Promise<boolean> {
  return loadBoolSetting(MOVE_LIMIT_ENABLED_KEY, false);
}

export async function saveMoveLimitEnabled(enabled: boolean): Promise<void> {
  await saveBoolSetting(MOVE_LIMIT_ENABLED_KEY, enabled);
}

function useBoolSetting(
  key: 'sound' | 'moveLimit',
  load: () => Promise<boolean>,
  save: (enabled: boolean) => Promise<void>,
  initial: boolean,
) {
  const [enabled, setEnabled] = useState(initial);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void load().then((value) => {
      if (!cancelled) {
        setEnabled(value);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per setting key
  }, [key]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      void save(next);
      return next;
    });
  }, [save]);

  return { enabled, toggle, isLoaded };
}

export function useSoundEnabled() {
  const { enabled, toggle, isLoaded } = useBoolSetting('sound', loadSoundEnabled, saveSoundEnabled, true);
  return { soundEnabled: enabled, toggleSound: toggle, isLoaded };
}

export function useMoveLimitEnabled() {
  const { enabled, toggle, isLoaded } = useBoolSetting('moveLimit', loadMoveLimitEnabled, saveMoveLimitEnabled, false);
  return { moveLimitEnabled: enabled, toggleMoveLimit: toggle, isLoaded };
}
