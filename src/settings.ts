import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export const SOUND_ENABLED_KEY = 'color-flow-maze:sound-enabled';

export async function loadSoundEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(SOUND_ENABLED_KEY);
    if (raw === null) return true;
    return raw === 'true';
  } catch {
    return true;
  }
}

export async function saveSoundEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SOUND_ENABLED_KEY, enabled ? 'true' : 'false');
  } catch {
    // best-effort
  }
}

export function useSoundEnabled() {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadSoundEnabled().then((value) => {
      if (!cancelled) {
        setSoundEnabled(value);
        setIsLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleSound = useCallback(async () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      void saveSoundEnabled(next);
      return next;
    });
  }, []);

  return { soundEnabled, toggleSound, isLoaded };
}
