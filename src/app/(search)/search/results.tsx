import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FlightCard } from '@/components/flight/flight-card';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { MaxContentWidth, Radius } from '@/constants/theme';
import { useFlightSearch } from '@/hooks/use-flight-search';
import { useTheme } from '@/hooks/use-theme';
import {
  activeFilterCount,
  DEFAULT_FILTERS,
  toSearchParams,
  useSearch,
} from '@/providers/search-provider';
import { addDays, formatDayMonth, todayVn, weekdayShort } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { totalPassengers } from '@/utils/passengers';

const STRIP_DAYS = 5;
const MAX_DAYS_AHEAD = 180;

export default function ResultsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { criteria, setDate, filters, setFilters } = useSearch();
  const search = useFlightSearch(toSearchParams(criteria, filters));
  const filterCount = activeFilterCount(filters);

  // A window of consecutive days that always contains the selected date and never starts in the past.
  const today = todayVn();
  const last = addDays(today, MAX_DAYS_AHEAD);
  let start = addDays(criteria.date, -Math.floor(STRIP_DAYS / 2));
  if (start < today) start = today;
  if (addDays(start, STRIP_DAYS - 1) > last) start = addDays(last, -(STRIP_DAYS - 1));
  const days = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(start, i));

  const cheapest = search.items.reduce<number | null>(
    (min, f) => (f.lowestAdultFare !== null && (min === null || f.lowestAdultFare < min) ? f.lowestAdultFare : min),
    null,
  );

  return (
    <View style={[styles.root, { backgroundColor: theme.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.back}>
          <Feather name="arrow-left" size={22} color={theme.text} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sửa tìm kiếm"
          onPress={() => router.back()}
          style={[styles.summary, { backgroundColor: theme.backgroundElement }]}>
          <View style={styles.flex}>
            <AppText variant="smallBold" numberOfLines={1}>
              {criteria.from?.city} → {criteria.to?.city}
            </AppText>
            <AppText variant="caption" tone="textMuted">
              {formatDayMonth(criteria.date)} · {totalPassengers(criteria)} khách
            </AppText>
          </View>
          <Feather name="edit-2" size={16} color={theme.textMuted} />
        </Pressable>
      </View>

      <View style={styles.strip}>
        {days.map((day) => {
          const active = day === criteria.date;
          return (
            <Pressable
              key={day}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`${weekdayShort(day)} ${formatDayMonth(day)}`}
              onPress={() => setDate(day)}
              style={[styles.day, { backgroundColor: active ? theme.text : theme.backgroundElement }]}>
              <AppText variant="caption" style={{ color: active ? theme.background : theme.textMuted }}>
                {weekdayShort(day)}
              </AppText>
              <AppText variant="smallBold" style={{ color: active ? theme.background : theme.text }}>
                {formatDayMonth(day)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          <Chip
            label={filterCount > 0 ? `Bộ lọc · ${filterCount}` : 'Bộ lọc'}
            icon="sliders"
            selected={filterCount > 0}
            tone="dark"
            onPress={() => router.push('/search/filters')}
          />
          <Chip
            label="Giá thấp nhất"
            selected={filters.sort === 'price'}
            tone="dark"
            onPress={() => setFilters((f) => ({ ...f, sort: 'price' }))}
          />
          <Chip
            label="Bay sớm nhất"
            selected={filters.sort === 'departure'}
            tone="dark"
            onPress={() => setFilters((f) => ({ ...f, sort: 'departure' }))}
          />
        </ScrollView>
      </View>

      <FlatList
        style={[styles.list, { backgroundColor: theme.backgroundElement }]}
        contentContainerStyle={styles.listContent}
        data={search.items}
        keyExtractor={(f) => String(f.flightId)}
        onEndReachedThreshold={0.5}
        onEndReached={() => void search.loadMore()}
        ListHeaderComponent={
          search.items.length > 0 ? (
            <AppText variant="caption" tone="textMuted" style={styles.count}>
              {search.total} chuyến bay · giá đã gồm thuế cho 1 người lớn
            </AppText>
          ) : undefined
        }
        ItemSeparatorComponent={Gap}
        renderItem={({ item }) => (
          <FlightCard
            flight={item}
            cheapest={item.lowestAdultFare !== null && item.lowestAdultFare === cheapest && filters.sort === 'price'}
            onPress={() =>
              router.push({ pathname: '/flight/[id]', params: { id: String(item.flightId) } })
            }
          />
        )}
        ListEmptyComponent={
          search.loading ? (
            <Skeletons />
          ) : search.error ? (
            <View style={styles.state}>
              <Banner tone="error">{errorMessage(search.error)}</Banner>
              <View style={styles.action}>
                <Button label="Thử lại" onPress={search.retry} />
              </View>
            </View>
          ) : (
            <EmptyState
              hasFilters={filterCount > 0}
              onClear={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort })}
              onChangeDate={() => router.push('/search/date')}
            />
          )
        }
        ListFooterComponent={
          search.loadingMore ? <ActivityIndicator style={styles.more} color={theme.primary} /> : undefined
        }
      />
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

function Skeletons() {
  const theme = useTheme();
  return (
    <View style={styles.gap3}>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.skeleton, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <View style={[styles.bar, { width: '40%', backgroundColor: theme.backgroundSelected }]} />
          <View style={[styles.bar, { width: '90%', height: 28, backgroundColor: theme.backgroundElement }]} />
          <View style={[styles.bar, { width: '55%', backgroundColor: theme.backgroundSelected }]} />
        </View>
      ))}
    </View>
  );
}

function EmptyState({
  hasFilters,
  onClear,
  onChangeDate,
}: {
  hasFilters: boolean;
  onClear: () => void;
  onChangeDate: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.state}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
        <Feather name="search" size={30} color={theme.primary} />
      </View>
      <AppText variant="h2" style={styles.center}>
        Không có chuyến phù hợp
      </AppText>
      <AppText tone="textSecondary" style={styles.center}>
        {hasFilters
          ? 'Không có chuyến nào khớp với bộ lọc của bạn trong ngày này.'
          : 'Không có chuyến nào trong ngày này. Hãy thử chọn ngày khác.'}
      </AppText>
      <View style={styles.action}>
        {hasFilters ? <Button label="Xóa tất cả bộ lọc" onPress={onClear} /> : null}
        <Button label="Đổi ngày bay" variant={hasFilters ? 'outline' : 'primary'} onPress={onChangeDate} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 10 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  summary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  strip: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingBottom: 10 },
  day: { flex: 1, alignItems: 'center', borderRadius: Radius.sm + 2, paddingVertical: 7 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  list: { flex: 1 },
  listContent: { padding: 16, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center', flexGrow: 1 },
  count: { marginBottom: 10 },
  gap: { height: 12 },
  gap3: { gap: 12 },
  more: { marginVertical: 16 },
  state: { paddingTop: 28, alignItems: 'stretch', gap: 8 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 8 },
  center: { textAlign: 'center' },
  action: { marginTop: 12, gap: 8 },
  skeleton: { borderWidth: 1, borderRadius: Radius.lg, padding: 16, gap: 12 },
  bar: { height: 14, borderRadius: 7 },
});
