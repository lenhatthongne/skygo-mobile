import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { TripCard } from '@/components/trips/trip-card';
import { TripGroupCard } from '@/components/trips/trip-group-card';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { RowErrorBoundary } from '@/components/ui/row-error-boundary';
import { BottomTabInset, MaxContentWidth, Radius } from '@/constants/theme';
import i18n from '@/i18n';
import { useBookings } from '@/hooks/use-bookings';
import { useNow } from '@/hooks/use-now';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import {
  useOnTabReset,
  useReloadOnTabReset,
  useScrollToTopOnTabReset,
} from '@/hooks/use-tab-reset';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';
import { entriesForTab, isPayable, TRIP_TABS, type TripEntry, type TripTab } from '@/utils/trips';

type EmptyState = {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
  text: string;
};

// Read when the list renders, so the text follows the language chosen in Settings.
const EMPTY: Record<TripTab, EmptyState> = {
  upcoming: {
    icon: 'map',
    get title() {
      return i18n.t('trips.emptyUpcomingTitle');
    },
    get text() {
      return i18n.t('trips.emptyUpcomingText');
    },
  },
  past: {
    icon: 'clock',
    get title() {
      return i18n.t('trips.emptyPastTitle');
    },
    get text() {
      return i18n.t('trips.emptyPastText');
    },
  },
  cancelled: {
    icon: 'x-circle',
    get title() {
      return i18n.t('trips.emptyCancelledTitle');
    },
    get text() {
      return i18n.t('trips.emptyCancelledText');
    },
  },
};

export default function TripsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    items,
    loading,
    refreshing,
    error,
    offlineAt,
    hasMore,
    loadingMore,
    loadMore,
    reload,
    refresh,
  } = useBookings();
  // A one-second tick re-renders the whole list, so only tick that fast while a hold countdown is
  // on screen; otherwise half a minute is enough to move trips between tabs.
  const counting = items.some(
    (b) => b.status === 'PENDING_PAYMENT' || b.status === 'PAYMENT_FAILED',
  );
  const now = useNow(true, counting ? 1000 : 30_000);
  const [tab, setTab] = useState<TripTab>('upcoming');

  // Refresh when coming back to the tab (after paying, cancelling or going offline); the first
  // focus is covered by the initial load.
  useRefreshOnFocus(reload);
  // Pressing the tab shows "Sắp tới" again, scrolled to the top with fresh trips.
  const list = useRef<FlatList<TripEntry>>(null);
  useScrollToTopOnTabReset(list);
  useReloadOnTabReset(reload);
  useOnTabReset(() => setTab('upcoming'));

  const visible = entriesForTab(items, tab, now);
  const upcomingCount = entriesForTab(items, 'upcoming', now).length;

  // The server cannot filter by status, so keep paging while the chosen tab has little to show.
  useEffect(() => {
    if (!loading && hasMore && !loadingMore && visible.length < 4) void loadMore();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, hasMore, loadingMore, visible.length]);

  const empty = EMPTY[tab];

  return (
    <View
      style={[styles.root, { backgroundColor: theme.backgroundElement, paddingTop: insets.top }]}>
      <View style={[styles.head, { backgroundColor: theme.background }]}>
        <View style={styles.inner}>
          <AppText variant="h1" style={styles.title}>
            {t('trips.title')}
          </AppText>
          <View
            style={[styles.segment, { backgroundColor: theme.backgroundElement }]}
            accessibilityRole="tablist">
            {TRIP_TABS.map((t) => {
              const selected = t.key === tab;
              return (
                <Pressable
                  key={t.key}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => setTab(t.key)}
                  style={[styles.segmentItem, selected && { backgroundColor: theme.background }]}>
                  {/* Never shrunk or wrapped: Android measured the shrinkable label too narrow and
                      clipped "Đã bay" to "Đã". Each tab is wide enough for its own short label. */}
                  <AppText
                    variant="smallBold"
                    tone={selected ? 'text' : 'textSecondary'}
                    numberOfLines={1}
                    style={styles.segmentLabel}>
                    {t.label}
                  </AppText>
                  {t.key === 'upcoming' && upcomingCount > 0 && !hasMore ? (
                    <View style={[styles.count, { backgroundColor: theme.primary }]}>
                      <AppText
                        variant="caption"
                        style={[styles.countText, { color: theme.onPrimary }]}>
                        {upcomingCount}
                      </AppText>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      {loading ? (
        <View style={[styles.list, styles.inner]}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={[
                styles.skeleton,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
            />
          ))}
        </View>
      ) : error ? (
        <View style={[styles.list, styles.inner]}>
          <Banner tone="error">{errorMessage(error)}</Banner>
          <Button label={t('trips.retry')} onPress={reload} style={styles.retry} />
        </View>
      ) : (
        <FlatList
          ref={list}
          data={visible}
          keyExtractor={(e) => e.key}
          contentContainerStyle={[
            styles.list,
            styles.inner,
            { paddingBottom: insets.bottom + BottomTabInset + 24 },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
          onEndReached={() => void loadMore()}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <RowErrorBoundary fallback={t('trips.rowError')}>
              {item.kind === 'single' ? (
                <TripCard
                  booking={item.booking}
                  now={now}
                  offline={!!offlineAt}
                  onOpen={() =>
                    router.push({ pathname: '/trips/[id]', params: { id: item.booking.id } })
                  }
                  onPay={() =>
                    router.push({
                      pathname: '/booking/payment',
                      params: { bookingId: item.booking.id },
                    })
                  }
                  onTicket={() =>
                    router.push({ pathname: '/trips/[id]/ticket', params: { id: item.booking.id } })
                  }
                />
              ) : (
                <TripGroupCard
                  legs={item.legs}
                  now={now}
                  offline={!!offlineAt}
                  onOpen={(leg) => router.push({ pathname: '/trips/[id]', params: { id: leg.id } })}
                  onTicket={(leg) =>
                    router.push({ pathname: '/trips/[id]/ticket', params: { id: leg.id } })
                  }
                  onSeats={(legs) =>
                    router.push({
                      pathname: '/trips/seats',
                      params: { ids: legs.map((l) => l.id).join(',') },
                    })
                  }
                  onPay={(leg) => {
                    // Paying the outbound leg while the return leg is also unpaid continues with it.
                    const other = item.legs.find((l) => l.id !== leg.id);
                    const next =
                      leg.leg === 'OUTBOUND' && other && isPayable(other, now)
                        ? other.id
                        : undefined;
                    router.push({
                      pathname: '/booking/payment',
                      params: next
                        ? { bookingId: leg.id, nextBookingId: next }
                        : { bookingId: leg.id },
                    });
                  }}
                />
              )}
            </RowErrorBoundary>
          )}
          ListHeaderComponent={
            offlineAt ? (
              <View style={styles.offline}>
                <Banner tone="warning" icon="wifi-off">
                  {t('trips.offline', { time: formatDateTime(offlineAt) })}
                </Banner>
                <Pressable accessibilityRole="button" onPress={refresh} style={styles.reconnect}>
                  <Feather name="refresh-cw" size={17} color={theme.primary} />
                  <AppText variant="smallBold" tone="primary">
                    {t('trips.reconnect')}
                  </AppText>
                </Pressable>
              </View>
            ) : undefined
          }
          ListEmptyComponent={
            hasMore ? (
              <ActivityIndicator color={theme.primary} style={styles.more} />
            ) : (
              <View style={styles.empty}>
                <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
                  <Feather name={empty.icon} size={28} color={theme.primary} />
                </View>
                <AppText variant="h2" style={styles.center}>
                  {empty.title}
                </AppText>
                <AppText tone="textSecondary" style={styles.center}>
                  {empty.text}
                </AppText>
                {tab === 'upcoming' ? (
                  <Button
                    label={t('trips.findFlights')}
                    onPress={() => router.push('/search')}
                    style={styles.cta}
                  />
                ) : null}
              </View>
            )
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={theme.primary} style={styles.more} />
            ) : undefined
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  head: { paddingHorizontal: 20, paddingBottom: 14 },
  title: { paddingTop: 12, paddingBottom: 14 },
  segment: { flexDirection: 'row', borderRadius: Radius.lg, padding: 4 },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 6,
  },
  segmentLabel: { flexShrink: 0 },
  count: {
    flexShrink: 0,
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontWeight: '800', lineHeight: 16 },
  list: { padding: 16, gap: 14 },
  skeleton: { height: 168, borderRadius: Radius.xl, borderWidth: 1, opacity: 0.6 },
  retry: { marginTop: 12 },
  more: { paddingVertical: 20 },
  offline: { gap: 4 },
  reconnect: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
  cta: { marginTop: 12, alignSelf: 'stretch' },
});
