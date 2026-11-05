import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { PickerField } from '@/components/ui/picker-field';
import { TextField } from '@/components/ui/text-field';
import { Screen } from '@/components/ui/screen';
import { useTheme } from '@/hooks/use-theme';
import { DEFAULT_FILTERS, DEPART_WINDOWS, useSearch } from '@/providers/search-provider';
import { getAirports } from '@/services/api/catalog';
import {
  clearRecentSearches,
  loadRecentSearches,
  type RecentSearch,
  saveRecentSearch,
} from '@/services/recent-searches';
import { formatLongDate } from '@/utils/datetime';
import { parseFlightIntent } from '@/utils/flight-intent';
import { partySummary } from '@/utils/passengers';

export default function SearchFormScreen() {
  const theme = useTheme();
  const params = useLocalSearchParams<{
    from?: string;
    to?: string;
    date?: string;
    returnDate?: string;
    adults?: string;
    children?: string;
    infants?: string;
  }>();
  const { criteria, setCriteria, setOutbound, setFilters } = useSearch();
  const [recent, setRecent] = useState<RecentSearch[]>([]);

  const [query, setQuery] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState<{ text: string; error: boolean } | null>(null);

  async function fillWithAi() {
    if (!query.trim() || aiBusy) return;
    Keyboard.dismiss();
    setAiBusy(true);
    setAiMessage(null);
    try {
      const response = await fetch('/api/flight-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (response.status === 429) {
        setAiMessage({ error: true, text: 'AI đang đạt giới hạn. Hãy thử lại sau hoặc điền biểu mẫu.' });
        return;
      }
      if (!response.ok) throw new Error('AI unavailable');
      const intent = parseFlightIntent(await response.json(), await getAirports());
      if (!intent) {
        setAiMessage({
          error: true,
          text: 'Hãy ghi rõ điểm đi, điểm đến, ngày bay và ngày về nếu có. Bạn cũng có thể điền biểu mẫu bên dưới.',
        });
        return;
      }
      setOutbound(null);
      setCriteria(intent.criteria);
      setFilters({ ...DEFAULT_FILTERS, ...intent.filters });
      const window = DEPART_WINDOWS.find((item) => item.id === intent.filters.windowId)?.label;
      const sort = intent.filters.sort === 'price' ? 'giá thấp trước' : 'giờ bay sớm trước';
      setAiMessage({ error: false, text: `Đã điền gợi ý. Giờ bay: ${window}. Sắp xếp: ${sort}. Hãy kiểm tra rồi bấm Tìm chuyến bay.` });
    } catch {
      setAiMessage({ error: true, text: 'AI tạm thời không khả dụng. Bạn vẫn có thể điền biểu mẫu.' });
    } finally {
      setAiBusy(false);
    }
  }

  // Prefill from a destination card on the home screen.
  useEffect(() => {
    if (!params.from && !params.to) return;
    let alive = true;
    getAirports()
      .then((list) => {
        if (!alive) return;
        const isDate = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);
        const count = (v: string | undefined, fallback: number) => (v && /^\d$/.test(v) ? Number(v) : fallback);
        setOutbound(null);
        setCriteria((c) => ({
          ...c,
          from: list.find((a) => a.code === params.from) ?? c.from,
          to: list.find((a) => a.code === params.to) ?? c.to,
          // Extra prefill (from the assistant): validated again by the search itself.
          ...(isDate(params.date) ? { date: params.date as string } : {}),
          ...(isDate(params.returnDate)
            ? { tripType: 'ROUND_TRIP' as const, returnDate: params.returnDate as string }
            : {}),
          ...(params.adults
            ? {
                adults: Math.max(1, count(params.adults, c.adults)),
                children: count(params.children, 0),
                infants: count(params.infants, 0),
              }
            : {}),
        }));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.from, params.to, params.date, params.returnDate, params.adults, setCriteria]);

  useEffect(() => {
    let alive = true;
    loadRecentSearches().then((items) => alive && setRecent(items));
    return () => {
      alive = false;
    };
  }, []);

  const sameAirport = !!criteria.from && criteria.from.code === criteria.to?.code;
  const canSearch = !!criteria.from && !!criteria.to && !sameAirport;

  function swap() {
    setCriteria((c) => ({ ...c, from: c.to, to: c.from }));
  }

  async function search() {
    if (!canSearch || !criteria.from || !criteria.to) return;
    const next = await saveRecentSearch({
      from: { code: criteria.from.code, city: criteria.from.city },
      to: { code: criteria.to.code, city: criteria.to.city },
      adults: criteria.adults,
      children: criteria.children,
      infants: criteria.infants,
    });
    setRecent(next);
    setOutbound(null);
    router.push('/search/results');
  }

  async function applyRecent(item: RecentSearch) {
    const airports = await getAirports().catch(() => []);
    setCriteria((c) => ({
      ...c,
      from: airports.find((a) => a.code === item.from.code) ?? c.from,
      to: airports.find((a) => a.code === item.to.code) ?? c.to,
      adults: item.adults,
      children: item.children,
      infants: item.infants,
    }));
  }

  return (
    <Screen
      header={{ title: 'Tìm chuyến bay', onBack: () => router.back(), close: true }}
      footer={
        <Button
          label="Tìm chuyến bay"
          onPress={() => void search()}
          disabled={!canSearch || aiBusy}
        />
      }>
      {__DEV__ && process.env.EXPO_PUBLIC_ENABLE_FLIGHT_AI === 'true' ? (
        <View style={styles.banner}>
          <TextField
            label="Tìm chuyến với AI"
            placeholder="Sài Gòn đi Đà Nẵng ngày mai, 2 người"
            hint="Chỉ nhập tiêu chí tìm chuyến. Nội dung được gửi tới Gemini."
            value={query}
            onChangeText={setQuery}
            editable={!aiBusy}
            maxLength={300}
          />
          <Button
            label="Gợi ý điền biểu mẫu"
            variant="outline"
            disabled={!query.trim()}
            loading={aiBusy}
            onPress={() => void fillWithAi()}
          />
          {aiMessage ? (
            <View style={styles.gap}>
              <Banner tone={aiMessage.error ? 'warning' : 'info'}>{aiMessage.text}</Banner>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.tripType}>
        <Chip
          label="Một chiều"
          tone="dark"
          selected={criteria.tripType === 'ONE_WAY'}
          onPress={() => setCriteria((c) => ({ ...c, tripType: 'ONE_WAY' }))}
        />
        <Chip
          label="Khứ hồi"
          tone="dark"
          selected={criteria.tripType === 'ROUND_TRIP'}
          onPress={() => setCriteria((c) => ({ ...c, tripType: 'ROUND_TRIP' }))}
        />
      </View>

      <View style={styles.fields}>
        <PickerField
          icon="send"
          label="Điểm đi"
          value={criteria.from ? `${criteria.from.city} (${criteria.from.code})` : undefined}
          placeholder="Chọn điểm đi"
          onPress={() => router.push({ pathname: '/search/airport', params: { field: 'from' } })}
        />
        <View style={styles.gap} />
        <PickerField
          icon="map-pin"
          label="Điểm đến"
          value={criteria.to ? `${criteria.to.city} (${criteria.to.code})` : undefined}
          placeholder="Chọn điểm đến"
          onPress={() => router.push({ pathname: '/search/airport', params: { field: 'to' } })}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Đổi điểm đi và điểm đến"
          onPress={swap}
          style={[styles.swap, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <Feather name="repeat" size={19} color={theme.primary} style={styles.swapIcon} />
        </Pressable>
      </View>

      {sameAirport ? (
        <View style={styles.banner}>
          <Banner tone="warning">Điểm đi và điểm đến cần khác nhau.</Banner>
        </View>
      ) : null}

      <View style={styles.gap} />
      <PickerField
        icon="calendar"
        label="Ngày bay"
        value={formatLongDate(criteria.date)}
        placeholder="Chọn ngày bay"
        onPress={() => router.push('/search/date')}
      />
      {criteria.tripType === 'ROUND_TRIP' ? (
        <>
          <View style={styles.gap} />
          <PickerField
            icon="calendar"
            label="Ngày về"
            value={formatLongDate(criteria.returnDate)}
            placeholder="Chọn ngày về"
            onPress={() => router.push({ pathname: '/search/date', params: { field: 'return' } })}
          />
        </>
      ) : null}
      <View style={styles.gap} />
      <PickerField
        icon="users"
        label="Hành khách"
        value={partySummary(criteria)}
        placeholder="Chọn số hành khách"
        onPress={() => router.push('/search/travellers')}
      />

      {recent.length > 0 ? (
        <View style={styles.recent}>
          <View style={styles.recentHeader}>
            <AppText variant="bodyBold">Tìm kiếm gần đây</AppText>
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => {
                void clearRecentSearches();
                setRecent([]);
              }}>
              <AppText variant="small" tone="textMuted">
                Xóa
              </AppText>
            </Pressable>
          </View>
          {recent.map((item) => (
            <Pressable
              key={`${item.from.code}-${item.to.code}-${item.adults}-${item.children}-${item.infants}`}
              accessibilityRole="button"
              onPress={() => void applyRecent(item)}
              style={[styles.recentRow, { borderColor: theme.border }]}>
              <View style={[styles.recentIcon, { backgroundColor: theme.backgroundElement }]}>
                <Feather name="clock" size={17} color={theme.textSecondary} />
              </View>
              <View style={styles.flex}>
                <AppText variant="smallBold">
                  {item.from.city} → {item.to.city}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {partySummary(item)}
                </AppText>
              </View>
              <Feather name="chevron-right" size={18} color={theme.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tripType: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  flex: { flex: 1 },
  fields: { marginTop: 12 },
  gap: { height: 8 },
  swap: {
    position: 'absolute',
    right: 16,
    top: 68 + 4 - 22,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapIcon: { transform: [{ rotate: '90deg' }] },
  banner: { marginTop: 12 },
  recent: { marginTop: 28 },
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recentIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
