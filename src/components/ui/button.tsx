import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

/** `inverse` is for use on a primary-coloured surface (white button, teal text). */
type Variant = 'primary' | 'outline' | 'ghost' | 'danger' | 'inverse';
type Size = 'md' | 'sm';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  /** `sm` is a compact pill (still 44 pt tall) for inline actions such as copying a code. */
  size?: Size;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const theme = useTheme();
  const inactive = disabled || loading;

  const palette = {
    primary: { bg: theme.primary, fg: theme.onPrimary, border: theme.primary },
    danger: { bg: theme.danger, fg: '#ffffff', border: theme.danger },
    outline: { bg: 'transparent', fg: theme.primary, border: theme.primary },
    ghost: { bg: 'transparent', fg: theme.primary, border: 'transparent' },
    inverse: { bg: theme.background, fg: theme.primaryDark, border: theme.background },
  }[variant];

  const filled = variant === 'primary' || variant === 'danger';
  const bg = disabled && filled ? theme.backgroundSelected : palette.bg;
  const border = disabled && filled ? theme.backgroundSelected : palette.border;
  const fg = disabled && filled ? theme.textMuted : palette.fg;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        size === 'sm' && styles.small,
        { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <>
          {icon ? (
            <MaterialCommunityIcons name={icon} size={size === 'sm' ? 18 : 20} color={fg} />
          ) : null}
          <AppText
            variant="bodyBold"
            style={[styles.label, size === 'sm' && styles.labelSmall, { color: fg }]}>
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  small: { minHeight: 44, borderRadius: Radius.pill, paddingHorizontal: 14 },
  label: { fontSize: 16 },
  labelSmall: { fontSize: 13.5 },
});
