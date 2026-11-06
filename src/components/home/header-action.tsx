import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { CountBadge } from '@/components/ui/count-badge';
import { useTheme } from '@/hooks/use-theme';

/** A round button in the Home header (notifications, messages) with its unread number on top. */
export function HeaderAction({
  icon,
  label,
  count,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  count: number;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 },
      ]}>
      <Feather name={icon} size={21} color={theme.text} />
      <CountBadge count={count} style={styles.badge} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: { position: 'absolute', top: -2, right: -2 },
});
