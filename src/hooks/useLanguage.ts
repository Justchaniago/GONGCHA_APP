import { useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

const LANG_KEY = '@gongcha_lang';

export function useLanguage() {
  const [language, setLanguage] = useState<'en' | 'id'>(
    i18n.language as 'en' | 'id'
  );

  const changeLanguage = useCallback(async (lang: 'en' | 'id') => {
    await i18n.changeLanguage(lang);
    await AsyncStorage.setItem(LANG_KEY, lang);
    setLanguage(lang);
  }, []);

  return { language, changeLanguage };
}

// Restore persisted lang on app boot — call once in App.tsx
export async function restoreLanguage() {
  const saved = await AsyncStorage.getItem(LANG_KEY);
  if (saved === 'en' || saved === 'id') {
    await i18n.changeLanguage(saved);
  }
}
