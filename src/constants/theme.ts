/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#1C2230',
    background: '#ffffff',
    backgroundElement: '#F4F5F8',
    backgroundSelected: '#E4E7EC',
    textSecondary: '#495162',
    textMuted: '#8A909C',
    border: '#E1E4EA',
    primary: '#0894AE',
    primaryDark: '#067A8F',
    primarySoft: '#E7F6F9',
    onPrimary: '#ffffff',
    danger: '#C62828',
    dangerSoft: '#FDECEC',
    success: '#15803D',
    successSoft: '#EAF7EF',
    warning: '#B45309',
    warningSoft: '#FFF4E5',
    info: '#1D5FD1',
    infoSoft: '#EAF1FE',
    /** Warm yellow of the sparkles in the assistant's mark. */
    aiSpark: '#FFE27A',
    purple: '#6D28D9',
    purpleSoft: '#F0EBFE',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    textMuted: '#8A909C',
    border: '#2E3135',
    primary: '#2BB8D1',
    primaryDark: '#5BD0E3',
    primarySoft: '#0E3A44',
    onPrimary: '#001B21',
    danger: '#FF6B6B',
    dangerSoft: '#3A1A1A',
    success: '#4ADE80',
    successSoft: '#12301F',
    warning: '#FBBF24',
    warningSoft: '#3A2A0E',
    info: '#6FA3FF',
    infoSoft: '#14233F',
    aiSpark: '#FFE27A',
    purple: '#B79CFF',
    purpleSoft: '#2A1F4A',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
