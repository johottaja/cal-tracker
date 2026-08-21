import { Ionicons } from '@expo/vector-icons';
import { cssInterop } from 'nativewind';
import type { ComponentProps } from 'react';

cssInterop(Ionicons, {
  className: {
    target: 'style',
    nativeStyleToProp: { color: true },
  },
});

export type AppIconName = ComponentProps<typeof Ionicons>['name'];

export function AppIcon({
  name,
  size = 22,
  className,
  accessibilityLabel,
}: {
  name: AppIconName;
  size?: number;
  className?: string;
  accessibilityLabel?: string;
}) {
  const decorative = !accessibilityLabel;
  return (
    <Ionicons
      name={name}
      size={size}
      className={className}
      accessibilityLabel={accessibilityLabel}
      importantForAccessibility={decorative ? 'no' : 'yes'}
      accessibilityElementsHidden={decorative}
    />
  );
}
