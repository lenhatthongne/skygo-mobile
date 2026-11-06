import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
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
  const theme = useTheme();
  const included = fare.checkedBaggageKg;
  const extra = baggageKg ?? 0;
  const total = included + extra;
  // Price per kg of each option; the cheapest one is flagged so the saving is visible.
  const perKg = baggageOptions.map((o) => Math.round(o.price / o.weightKg));
  const cheapest = perKg.length > 1 ? Math.min(...perKg) : null;

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

          <View style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.summaryTop}>
              <AppText variant="small" tone="textSecondary">
                Tổng ký gửi của bạn
              </AppText>
              <AppText variant="bodyBold">{total} kg</AppText>
            </View>
            <View style={[styles.bar, { backgroundColor: theme.border }]}>
              {included > 0 ? (
                <View style={{ flex: included, backgroundColor: theme.primary }} />
              ) : null}
              {extra > 0 ? (
                <View
                  style={{
                    flex: extra,
                    backgroundColor: theme.primary,
                    opacity: 0.45,
                  }}
                />
              ) : null}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                <AppText variant="caption" tone="textMuted">
                  Đã gồm {included} kg
                </AppText>
              </View>
              <View style={styles.legendItem}>
                <View
                  style={[styles.legendDot, { backgroundColor: theme.primary, opacity: 0.45 }]}
                />
                <AppText variant="caption" tone="textMuted">
                  Mua thêm {extra} kg
                </AppText>
              </View>
            </View>
          </View>

          <Option
            title="Không mua thêm"
            text={included > 0 ? `Dùng ${included} kg đã gồm` : 'Không ký gửi'}
            price={formatVnd(0)}
            selected={baggageKg === null}
            onPress={() => onBaggage(null)}
            icon="slash"
          />
          {baggageOptions.map((o, i) => (
            <Option
              key={o.weightKg}
              title={`+${o.weightKg} kg`}
              text={`${formatVnd(perKg[i])} / kg${
                cheapest !== null && perKg[i] === cheapest ? ' · rẻ nhất' : ''
              }`}
              price={formatVnd(o.price)}
              selected={baggageKg === o.weightKg}
              onPress={() => onBaggage(o.weightKg)}
              icon="briefcase"
            />
          ))}
        </>
      )}
    </View>
  );
}

type OptionProps = {
  title: string;
  text: string;
  price: string;
  selected: boolean;
  icon: React.ComponentProps<typeof Feather>['name'];
  onPress: () => void;
};

function Option({ title, text, price, selected, icon, onPress }: OptionProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title}, ${price}`}
      onPress={onPress}
      style={[
        styles.option,
        {
          backgroundColor: selected ? theme.primarySoft : theme.background,
          borderColor: selected ? theme.primary : theme.border,
        },
      ]}>
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.textMuted }]}>
        {selected ? <View style={[styles.dot, { backgroundColor: theme.primary }]} /> : null}
      </View>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: selected ? theme.background : theme.backgroundElement,
          },
        ]}>
        <Feather name={icon} size={17} color={theme.primary} />
      </View>
      <View style={styles.optionText}>
        <AppText variant="bodyBold">{title}</AppText>
        <AppText variant="caption" tone="textMuted">
          {text}
        </AppText>
      </View>
      <AppText variant="bodyBold">{price}</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: { gap: 8, marginTop: 12 },
  summary: { borderRadius: Radius.md, padding: 12, gap: 6 },
  summaryTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  legend: { flexDirection: 'row', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  bar: {
    height: 10,
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  option: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
});
