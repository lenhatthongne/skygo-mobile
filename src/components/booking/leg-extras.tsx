import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Chip } from '@/components/ui/chip';
import { formatVnd } from '@/utils/money';

type LegExtrasProps = {
  /** Shown on a round trip ("Chặng đi · SGN → HAN"); absent for a one-way booking. */
  title?: string;
  fare: Api.FareClass;
  baggageOptions: Api.BaggageOption[];
  baggageKg: number | null;
  onBaggage: (kg: number | null) => void;
};

/** Extra baggage of ONE passenger on ONE flight; the same block serves both legs. */
export function LegExtras({ title, fare, baggageOptions, baggageKg, onBaggage }: LegExtrasProps) {
  return (
    <View style={styles.block}>
      {title ? (
        <AppText variant="smallBold" tone="primaryDark">
          {title}
        </AppText>
      ) : null}

      {baggageOptions.length === 0 ? (
        <AppText variant="small" tone="textMuted">
          Hạng vé này không có gói hành lý mua thêm.
        </AppText>
      ) : (
        <>
          <AppText variant="label">Hành lý ký gửi thêm</AppText>
          <AppText variant="caption" tone="textMuted">
            {fare.checkedBaggageKg > 0
              ? `Đã gồm ${fare.checkedBaggageKg} kg ký gửi. `
              : 'Hạng vé này chưa gồm hành lý ký gửi. '}
            Mua thêm nếu cần, giá do SkyGo tính.
          </AppText>
          <View style={styles.chips}>
            <Chip label="Không" selected={baggageKg === null} onPress={() => onBaggage(null)} />
            {baggageOptions.map((o) => (
              <Chip
                key={o.weightKg}
                label={`+${o.weightKg} kg · ${formatVnd(o.price)}`}
                selected={baggageKg === o.weightKg}
                onPress={() => onBaggage(o.weightKg)}
              />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: 6, marginTop: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
});
