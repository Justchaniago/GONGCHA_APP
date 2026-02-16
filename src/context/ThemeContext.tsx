// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { LIGHT_COLORS, DARK_COLORS, ThemeMode, ColorTheme } from '../theme/colorTokens';

type ThemeOption = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: ThemeOption;           // Pilihan User: 'light' | 'dark' | 'system'
  activeMode: ThemeMode;        // Mode Aktif: 'light' | 'dark' (hasil kalkulasi)
  colors: ColorTheme;           // Object warna yang siap pakai
  setTheme: (theme: ThemeOption) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorScheme = useColorScheme(); // Detect HP setting (Dark/Light)
  const [theme, setThemeState] = useState<ThemeOption>('system');
  const [isReady, setIsReady] = useState(false);

  // 1. Load preference on startup
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const storedTheme = await AsyncStorage.getItem('user_theme');
        if (storedTheme) {
          setThemeState(storedTheme as ThemeOption);
        }
      } catch (e) {
        console.log('Failed to load theme', e);
      } finally {
        setIsReady(true);
      }
    };
    loadTheme();
  }, []);

  // 2. Save preference on change
  const setTheme = async (newTheme: ThemeOption) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem('user_theme', newTheme);
    } catch (e) {
      console.log('Failed to save theme', e);
    }
  };

  // 3. Logic to determine active mode
  const activeMode: ThemeMode = useMemo(() => {
    if (theme === 'system') {
      return systemColorScheme === 'dark' ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemColorScheme]);

  // 4. Determine colors based on active mode
  const colors = useMemo(() => {
    return activeMode === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }, [activeMode]);

  const toggleTheme = () => {
    setTheme(activeMode === 'light' ? 'dark' : 'light');
  };

  // Prevent flash of wrong theme
  if (!isReady) return null; 

  return (
    <ThemeContext.Provider value={{ theme, activeMode, colors, setTheme, toggleTheme }}>
      {/* Otomatis ubah warna status bar (jam, sinyal) */}
      <StatusBar style={activeMode === 'dark' ? 'light' : 'dark'} animated />
      {children}
    </ThemeContext.Provider>
  );
};

// Custom Hook untuk akses cepat
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};