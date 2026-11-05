import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/hooks/use-theme';
import { fareHighlights } from '@/utils/amenities';

/** What a fare class includes, one icon row per benefit; what it lacks is shown muted. */
export function FareHighlights({ fare, onlyIncluded = false }: { fare: Api.FareClass; onlyIncluded?: boolean }) {
  const theme = useTheme();
  const items = fareHighlights(fare).filter((h) => h.included || !onlyIncluded);
  return (
    <View style={styles.list}>
      {items.map((h) => (
        <View key={h.key} style={styles.row} accessible accessibilityLabel={`${h.label}${h.included ? '' : ', không có'}`}>
          <View style={[styles.icon, { backgroundColor: h.included ? theme.primarySoft : theme.backgroundElement }]}>
            <MaterialCommunityIcons
              name={h.icon}
              size={18}
              color={h.included ? theme.primary : theme.textMuted}
            />
          </View>
          <AppText variant="small" tone={h.included ? 'text' : 'textMuted'} style={styles.label}>
            {h.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1 },
});
