import { useColorScheme, type ColorValue } from 'react-native';

type GradientStops = readonly [ColorValue, ColorValue, ...ColorValue[]];

export const macroColors = {
  calories: '#d9773a',
  proteinG: '#3d7396',
  carbsG: '#a57b18',
  fatG: '#7a5278',
} as const;

export const macroGradients = {
  calories: ['#f0a06c', '#d9773a'] as GradientStops,
  proteinG: ['#7eb0d0', '#3d7396'] as GradientStops,
  carbsG: ['#e2bd5c', '#a57b18'] as GradientStops,
  fatG: ['#c4a0c0', '#7a5278'] as GradientStops,
} as const;

export const lightTheme = {
  background: '#f3eee4',
  surface: '#fffdf8',
  elevated: '#ffffff',
  text: '#182022',
  muted: '#4a5557',
  border: '#d5d0c4',
  primary: '#2f6b4f',
  primarySoft: '#d7e8dd',
  onPrimarySoft: '#182022',
  success: '#2f6b4f',
  warning: '#a57b18',
  error: '#b42318',
  tabBar: '#fffaf2',
  shadow: '#17201d',
};

export const darkTheme = {
  background: '#0f1413',
  surface: '#18201e',
  elevated: '#222c29',
  text: '#f4f0e6',
  muted: '#c5ceca',
  border: '#3a4743',
  primary: '#7fbe9b',
  primarySoft: '#1d3329',
  onPrimarySoft: '#f4f0e6',
  success: '#7fbe9b',
  warning: '#e2bd5c',
  error: '#f2a4a0',
  tabBar: '#141b19',
  shadow: '#000000',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export type AppTheme = typeof lightTheme;

export function useAppTheme(): AppTheme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
