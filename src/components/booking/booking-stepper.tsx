import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const STEPS: { icon: IconName; label: string }[] = [
  { icon: 'account', label: 'Hành khách' },
  { icon: 'bag-suitcase', label: 'Hành lý' },
  { icon: 'seat-passenger', label: 'Chọn ghế' },
  { icon: 'credit-card', label: 'Thanh toán' },
];

/**
 * The four booking steps: passengers, baggage, seats, payment. Steps up to `current` (1 to 4) are
 * filled; the lines between reached steps are filled too.
 */
export function BookingStepper({ current }: { current: number }) {
  const theme = useTheme();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={`Bước ${current} trên ${STEPS.length}: ${STEPS[current - 1]?.label ?? ''}`}
      accessibilityValue={{ min: 1, max: STEPS.length, now: current }}
      style={styles.row}>
      {STEPS.map((step, i) => {
        const reached = i < current;
        return (
          <View key={step.label} style={[styles.item, i > 0 && styles.grow]}>
            {i > 0 ? (
              <View style={[styles.line, { backgroundColor: reached ? theme.primary : theme.backgroundSelected }]} />
            ) : null}
            <View style={[styles.circle, { backgroundColor: reached ? theme.primary : theme.backgroundElement }]}>
              <MaterialCommunityIcons name={step.icon} size={22} color={reached ? theme.onPrimary : theme.textMuted} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  item: { flexDirection: 'row', alignItems: 'center' },
  grow: { flex: 1 },
  line: { flex: 1, height: 3 },
  circle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
