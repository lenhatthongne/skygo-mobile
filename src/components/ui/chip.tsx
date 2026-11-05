import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type ChipProps = {
  label: string;
  selected?: boolean;
  /** 'dark' for sort/segment style, 'primary' for filter selections. */
  tone?: 'primary' | 'dark';
  icon?: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
};

export function Chip({ label, selected = false, tone = 'primary', icon, onPress }: ChipProps) {
  const theme = useTheme();
  const dark = tone === 'dark';
  const bg = selected ? (dark ? theme.text : theme.primarySoft) : theme.background;
  const border = selected ? (dark ? theme.text : theme.primary) : theme.border;
  const fg = selected ? (dark ? theme.background : theme.primaryDark) : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      {icon ? <Feather name={icon} size={15} color={fg} /> : null}
      <AppText variant="small" style={{ color: fg, fontWeight: selected ? '700' : '500' }}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
});
