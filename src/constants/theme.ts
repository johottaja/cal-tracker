import { useColorScheme } from 'react-native';

const palette = {
  ink: '#182022',
  cream: '#F7F3EA',
  paper: '#FFFDF8',
  moss: '#2F6B4F',
  mossSoft: '#DDEBE2',
  apricot: '#E98A59',
  sky: '#4D83A6',
  gold: '#C49A32',
  plum: '#8A5E86',
  red: '#B84C4C',
  white: '#FFFFFF',
  black: '#0E1213',
};

export const lightTheme = {
  background: palette.cream,
  surface: palette.paper,
  elevated: palette.white,
  text: palette.ink,
  muted: '#687173',
  border: '#DED9CE',
  primary: palette.moss,
  primarySoft: palette.mossSoft,
  onPrimarySoft: palette.ink,
  success: palette.moss,
  warning: palette.gold,
  error: palette.red,
  tabBar: '#FFFCF5',
  shadow: '#17201D',
};

export const darkTheme = {
  background: '#101514',
  surface: '#18201E',
  elevated: '#202A27',
  text: '#F7F3EA',
  muted: '#A7B0AC',
  border: '#34403C',
  primary: '#79B996',
  primarySoft: '#233B30',
  onPrimarySoft: palette.white,
  success: '#79B996',
  warning: '#E2BD5C',
  error: '#EF8B86',
  tabBar: '#141B19',
  shadow: '#000000',
};

export const macroColors = {
  calories: palette.apricot,
  proteinG: palette.sky,
  carbsG: palette.gold,
  fatG: palette.plum,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  huge: 48,
} as const;

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export type AppTheme = typeof lightTheme;

export function useAppTheme(): AppTheme {
  return useColorScheme() === 'dark' ? darkTheme : lightTheme;
}
