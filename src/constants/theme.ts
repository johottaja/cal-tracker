import { useColorScheme, type ColorValue } from 'react-native';

type GradientStops = readonly [ColorValue, ColorValue, ...ColorValue[]];

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

export const macroColors = {
  calories: palette.apricot,
  proteinG: palette.sky,
  carbsG: palette.gold,
  fatG: palette.plum,
} as const;

export const macroGradients = {
  calories: ['#F5A87A', '#E98A59'] as GradientStops,
  proteinG: ['#6BA0C8', '#4D83A6'] as GradientStops,
  carbsG: ['#D9B04A', '#C49A32'] as GradientStops,
  fatG: ['#A88AA4', '#8A5E86'] as GradientStops,
} as const;

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
  gradients: {
    screen: ['#F7F3EA', '#FFF5E8', '#F0E8D8'] as GradientStops,
    primary: ['#3D7A5E', '#2F6B4F'] as GradientStops,
    icon: ['#E4F0E8', '#DDEBE2'] as GradientStops,
    card: ['#FFFDF8', '#FFF8EE'] as GradientStops,
    hero: ['#3D7A5E', '#2F6B4F', '#285943'] as GradientStops,
    tabBar: ['#FFFCF5', '#F3EDE2'] as GradientStops,
    segment: ['#FFFFFF', '#F7F1E6'] as GradientStops,
  },
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
  gradients: {
    screen: ['#101514', '#16201C', '#0C100F'] as GradientStops,
    primary: ['#8FCEAB', '#4F8F6E'] as GradientStops,
    icon: ['#2E4A3C', '#233B30'] as GradientStops,
    card: ['#1C2623', '#151D1B'] as GradientStops,
    hero: ['#3A6B55', '#254636', '#1A3228'] as GradientStops,
    tabBar: ['#18201E', '#121917'] as GradientStops,
    segment: ['#2A3833', '#1F2B27'] as GradientStops,
  },
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
