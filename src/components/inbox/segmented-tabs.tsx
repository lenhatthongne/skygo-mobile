import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SegmentedTab<K extends string> = { key: K; label: string };

/** Tabs in one rounded track; the chosen one is raised.  */
export function SegmentedTabs<K extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: SegmentedTab<K>[];
  value: K;
  onChange: (key: K) => void;
}) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="tablist"
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {tabs.map((tab) => {
        const selected = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(tab.key)}
            style={[styles.tab, selected && { backgroundColor: theme.background }]}>
            <AppText
              variant={selected ? 'bodyBold' : 'body'}
              tone={selected ? 'text' : 'textSecondary'}>
              {tab.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: Radius.lg, padding: 4, marginTop: 4 },
  tab: {
    flex: 1,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: Radius.md,
  },
});
