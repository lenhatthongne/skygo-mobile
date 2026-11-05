import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BottomTabInset } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setAssistantFabHidden, useAssistantFabHidden } from '@/services/assistant-fab-store';

import { AssistantIcon } from './assistant-icon';

/**
 * Round button that opens the assistant (Home and Trips). The small × at its top right hides it
 * so it never covers content; it comes back from Settings.
 */
export function AssistantFab() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const hidden = useAssistantFabHidden();
  if (hidden) return null;

  return (
    <View style={[styles.wrap, { bottom: insets.bottom + BottomTabInset + 16 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Mở Trợ lý SkyGo"
        onPress={() => router.push('/assistant')}
        style={({ pressed }) => [
          styles.fab,
          // A solid fill lets the native shadow be computed cheaply (the SVG is transparent).
          { backgroundColor: theme.primary, opacity: pressed ? 0.9 : 1 },
        ]}>
        <AssistantIcon size={56} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ẩn nút Trợ lý"
        hitSlop={10}
        onPress={() => void setAssistantFabHidden(true)}
        style={[styles.close, { backgroundColor: theme.textSecondary, borderColor: theme.background }]}>
        <Feather name="x" size={12} color={theme.background} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', right: 16, width: 56, height: 56 },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  close: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
