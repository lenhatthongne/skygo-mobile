import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { useSearch } from '@/providers/search-provider';
import { MAX_SEATS, type Party, seatCount, totalPassengers } from '@/utils/passengers';

export default function TravellersScreen() {
  const { criteria, setCriteria } = useSearch();
  const [party, setParty] = useState<Party>({
    adults: criteria.adults,
    children: criteria.children,
    infants: criteria.infants,
  });
  const seatsFull = seatCount(party) >= MAX_SEATS;

  function update(next: Party) {
    // Every infant needs an adult to travel with.
    setParty({ ...next, infants: Math.min(next.infants, next.adults) });
  }

  return (
    <Screen
      header={{ title: 'Hành khách', onBack: () => router.back(), close: true }}
      footer={
        <Button
          label={`Xong · ${totalPassengers(party)} khách`}
          onPress={() => {
            setCriteria((c) => ({ ...c, ...party }));
            router.back();
          }}
        />
      }>
      <View style={styles.list}>
        <Counter
          label="Người lớn"
          sub="Từ 12 tuổi"
          value={party.adults}
          canDecrease={party.adults > 1}
          canIncrease={!seatsFull}
          onChange={(v) => update({ ...party, adults: v })}
        />
        <Counter
          label="Trẻ em"
          sub="Từ 2 đến dưới 12 tuổi"
          value={party.children}
          canDecrease={party.children > 0}
          canIncrease={!seatsFull}
          onChange={(v) => update({ ...party, children: v })}
        />
        <Counter
          label="Em bé"
          sub="Dưới 2 tuổi, ngồi cùng người lớn"
          value={party.infants}
          canDecrease={party.infants > 0}
          canIncrease={party.infants < party.adults}
          onChange={(v) => update({ ...party, infants: v })}
        />
      </View>
      <View style={styles.banner}>
        <Banner tone="info">
          Mỗi người lớn đi kèm tối đa 1 em bé. Tối đa {MAX_SEATS} khách có ghế (người lớn và trẻ em).
        </Banner>
      </View>
    </Screen>
  );
}

function Counter({
  label,
  sub,
  value,
  canDecrease,
  canIncrease,
  onChange,
}: {
  label: string;
  sub: string;
  value: number;
  canDecrease: boolean;
  canIncrease: boolean;
  onChange: (value: number) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderColor: theme.border }]}>
      <View style={styles.flex}>
        <AppText variant="bodyBold">{label}</AppText>
        <AppText variant="caption" tone="textMuted">
          {sub}
        </AppText>
      </View>
      <View style={styles.controls}>
        <Step
          icon="minus"
          label={`Giảm ${label.toLowerCase()}`}
          enabled={canDecrease}
          onPress={() => onChange(value - 1)}
        />
        <AppText variant="h2" style={styles.value}>
          {value}
        </AppText>
        <Step
          icon="plus"
          label={`Tăng ${label.toLowerCase()}`}
          enabled={canIncrease}
          onPress={() => onChange(value + 1)}
        />
      </View>
    </View>
  );
}

function Step({
  icon,
  label,
  enabled,
  onPress,
}: {
  icon: 'plus' | 'minus';
  label: string;
  enabled: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  const color = enabled ? theme.primary : theme.border;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !enabled }}
      disabled={!enabled}
      hitSlop={6}
      onPress={onPress}
      style={[styles.step, { borderColor: color }]}>
      <Feather name={icon} size={17} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  list: { marginTop: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  value: { minWidth: 20, textAlign: 'center' },
  step: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  banner: { marginTop: 20 },
});
