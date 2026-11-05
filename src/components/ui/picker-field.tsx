import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type PickerFieldProps = {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  value?: string;
  placeholder: string;
  onPress: () => void;
};

/** A tappable form row that shows the current value of a picker. */
export function PickerField({ icon, label, value, placeholder, onPress }: PickerFieldProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? 'chưa chọn'}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.85 : 1 },
      ]}>
      <Feather name={icon} size={21} color={theme.textSecondary} />
      <View style={styles.text}>
        <AppText variant="caption" tone="textMuted">
          {label}
        </AppText>
        <AppText variant="bodyBold" tone={value ? 'text' : 'textMuted'} numberOfLines={1}>
          {value ?? placeholder}
        </AppText>
      </View>
      <Feather name="chevron-right" size={18} color={theme.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    height: 68,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  text: { flex: 1 },
});
