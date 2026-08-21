import { Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { macroGradients, useAppTheme } from '@/constants/theme';
import type { MacroKey } from '@/domain/models';
import { macroMeta } from '@/features/shared/FeatureUI';
import { cn } from '@/lib/cn';

const ARC_SWEEP_DEG = 200;
const START_DEG = 90 + (360 - ARC_SWEEP_DEG) / 2;
const RADIUS = 100;

const strokeBySize = {
  hero: 22,
  mini: 28,
} as const;

const miniValueClass = {
  calories: 'text-macro-calories',
  proteinG: 'text-macro-protein',
  carbsG: 'text-macro-carbs',
  fatG: 'text-macro-fat',
} as const;

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

function pointOnArc(cx: number, cy: number, radius: number, deg: number) {
  const rad = toRad(deg);
  return {
    x: cx + radius * Math.cos(rad),
    y: cy + radius * Math.sin(rad),
  };
}

function arcPath(cx: number, cy: number, radius: number) {
  const start = pointOnArc(cx, cy, radius, START_DEG);
  const end = pointOnArc(cx, cy, radius, START_DEG + ARC_SWEEP_DEG);
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 1 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function geometry(strokeWidth: number) {
  const pad = strokeWidth / 2 + 4;
  const start = pointOnArc(0, 0, RADIUS, START_DEG);
  const end = pointOnArc(0, 0, RADIUS, START_DEG + ARC_SWEEP_DEG);
  const minX = Math.min(start.x, end.x) - pad;
  const maxX = Math.max(start.x, end.x) + pad;
  const minY = -RADIUS - pad;
  const maxY = Math.max(start.y, end.y) + pad;
  const cx = -minX;
  const cy = -minY;
  return {
    width: maxX - minX,
    height: maxY - minY,
    path: arcPath(cx, cy, RADIUS),
    length: 2 * Math.PI * RADIUS * (ARC_SWEEP_DEG / 360),
  };
}

const heroGeometry = geometry(strokeBySize.hero);
const miniGeometry = geometry(strokeBySize.mini);

export function MacroGauge({
  consumed,
  goal,
  macro,
  size,
}: {
  consumed: number;
  goal: number;
  macro: MacroKey;
  size: 'hero' | 'mini';
}) {
  const theme = useAppTheme();
  const meta = macroMeta[macro];
  const strokeWidth = strokeBySize[size];
  const { width, height, path, length } = size === 'hero' ? heroGeometry : miniGeometry;
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const remaining = goal - consumed;
  const gradientId = `gauge-${macro}-${size}`;
  const consumedLabel = Math.round(consumed);
  const goalLabel = Math.round(goal);
  const isHero = size === 'hero';

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`${meta.label}, ${consumedLabel} of ${goalLabel} ${meta.unit}${
        remaining >= 0
          ? `, ${Math.round(remaining)} remaining`
          : `, ${Math.abs(Math.round(remaining))} over`
      }`}
      accessibilityValue={{ min: 0, max: goalLabel, now: consumedLabel }}
      className={cn(isHero ? 'w-full items-center' : 'min-w-0 flex-1 items-center')}>
      <View
        className={cn('w-full', isHero && 'max-w-[340px] self-center')}
        style={{ aspectRatio: width / height }}>
        <Svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={macroGradients[macro][0]} />
              <Stop offset="1" stopColor={macroGradients[macro][1]} />
            </LinearGradient>
          </Defs>
          <Path
            d={path}
            fill="none"
            stroke={theme.border}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {progress > 0 ? (
            <Path
              d={path}
              fill="none"
              stroke={`url(#${gradientId})`}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${length} ${length}`}
              strokeDashoffset={length * (1 - progress)}
            />
          ) : null}
        </Svg>
        <View
          pointerEvents="none"
          className={cn(
            'absolute inset-0 items-center',
            isHero ? 'justify-end px-1 pb-1' : 'justify-end pb-0',
          )}>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.5}
            style={{ includeFontPadding: false }}
            className={cn(
              'w-full text-center font-black leading-none tracking-tighter',
              isHero
                ? 'text-8xl text-macro-calories'
                : cn('text-4xl', miniValueClass[macro]),
            )}>
            {consumedLabel}
          </Text>
          {isHero ? (
            <Text className="w-full text-center text-sm font-semibold leading-5 text-muted-foreground">
              kcal
            </Text>
          ) : null}
        </View>
      </View>
      {isHero ? (
        <Text
          className={cn(
            'mt-1 w-full text-center text-[13px] font-semibold',
            remaining < 0 ? 'text-warning' : 'text-muted-foreground',
          )}>
          {remaining >= 0
            ? `${Math.round(remaining)} kcal remaining`
            : `${Math.abs(Math.round(remaining))} kcal over goal`}
        </Text>
      ) : (
        <View className="mt-1 w-full">
          <Text className="text-center text-[13px] font-extrabold text-foreground">
            {meta.shortLabel}
          </Text>
          <Text className="text-center text-[11px] font-semibold text-muted-foreground">
            {consumedLabel} / {goalLabel} {meta.unit}
          </Text>
        </View>
      )}
    </View>
  );
}
