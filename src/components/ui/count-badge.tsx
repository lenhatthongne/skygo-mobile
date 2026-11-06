import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

/** A small red number for unread things: nothing is drawn for zero, 9+ for anything larger. */
export function CountBadge({ count, style }: { count: number; style?: ViewStyle }) {
  const theme = useTheme();
  if (count <= 0) return null;
  return (
    <View style={[styles.badge, { backgroundColor: theme.danger }, style]}>
      <AppText variant="caption" style={[styles.text, { color: theme.onPrimary }]}>
        {count > 9 ? '9+' : count}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
});
