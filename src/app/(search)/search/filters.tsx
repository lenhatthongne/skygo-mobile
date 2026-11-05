import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AirlineBadge } from '@/components/flight/airline-badge';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import {
  DEFAULT_FILTERS,
  DEPART_WINDOWS,
  PRICE_RANGES,
  type SearchFilters,
  useSearch,
} from '@/providers/search-provider';
import { getAirlines } from '@/services/api/catalog';

export default function FiltersScreen() {
  const theme = useTheme();
  const { filters, setFilters } = useSearch();
  const [draft, setDraft] = useState<SearchFilters>(filters);
  const [airlines, setAirlines] = useState<Api.Airline[]>([]);

  useEffect(() => {
    let alive = true;
    getAirlines()
      .then((list) => alive && setAirlines(list))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  function toggleAirline(code: string) {
    setDraft((d) => ({
      ...d,
      airlines: d.airlines.includes(code) ? d.airlines.filter((c) => c !== code) : [...d.airlines, code],
    }));
  }

  return (
    <Screen
      header={{ title: 'Sắp xếp & lọc', onBack: () => router.back(), close: true }}
      footer={
        <View style={styles.footer}>
          <Button
            label="Xóa lọc"
            variant="ghost"
            style={styles.clear}
            onPress={() => setDraft({ ...DEFAULT_FILTERS, sort: draft.sort })}
          />
          <Button
            label="Áp dụng"
            style={styles.flex}
            onPress={() => {
              setFilters(draft);
              router.back();
            }}
          />
        </View>
      }>
      <AppText variant="bodyBold" style={styles.title}>
        Sắp xếp theo
      </AppText>
      <View style={styles.chips}>
        <Chip label="Giá thấp nhất" tone="dark" selected={draft.sort === 'price'} onPress={() => setDraft((d) => ({ ...d, sort: 'price' }))} />
        <Chip label="Giờ khởi hành" tone="dark" selected={draft.sort === 'departure'} onPress={() => setDraft((d) => ({ ...d, sort: 'departure' }))} />
      </View>

      <AppText variant="bodyBold" style={styles.title}>
        Giá vé mỗi khách
      </AppText>
      <View style={styles.chips}>
        {PRICE_RANGES.map((p) => (
          <Chip key={p.id} label={p.label} selected={draft.priceId === p.id} onPress={() => setDraft((d) => ({ ...d, priceId: p.id }))} />
        ))}
      </View>

      <AppText variant="bodyBold" style={styles.title}>
        Giờ khởi hành
      </AppText>
      <View style={styles.chips}>
        {DEPART_WINDOWS.map((w) => (
          <Chip
            key={w.id}
            label={w.from ? `${w.label} ${w.from}–${w.to}` : w.label}
            selected={draft.windowId === w.id}
            onPress={() => setDraft((d) => ({ ...d, windowId: w.id }))}
          />
        ))}
      </View>

      {airlines.length > 0 ? (
        <>
          <AppText variant="bodyBold" style={styles.title}>
            Hãng bay
          </AppText>
          {airlines.map((a) => {
            const checked = draft.airlines.includes(a.code);
            return (
              <Pressable
                key={a.code}
                accessibilityRole="checkbox"
                accessibilityState={{ checked }}
                onPress={() => toggleAirline(a.code)}
                style={[styles.airline, { borderColor: theme.border }]}>
                <AirlineBadge airline={a} size={36} />
                <AppText variant="bodyBold" style={styles.flex}>
                  {a.name}
                </AppText>
                <View
                  style={[
                    styles.box,
                    { borderColor: checked ? theme.primary : theme.border, backgroundColor: checked ? theme.primary : 'transparent' },
                  ]}>
                  {checked ? <Feather name="check" size={14} color={theme.onPrimary} /> : null}
                </View>
              </Pressable>
            );
          })}
          <AppText variant="caption" tone="textMuted" style={styles.hint}>
            Không chọn hãng nào nghĩa là hiển thị tất cả hãng.
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { marginTop: 24, marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  clear: { width: 110 },
  airline: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1 },
  box: { width: 22, height: 22, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hint: { marginTop: 8 },
});
