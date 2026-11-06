import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { AssistantFab } from '@/components/assistant/assistant-fab';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { useUnreadCount } from '@/services/notification-inbox';
import { HeaderAction } from '@/components/home/header-action';
import { Radius } from '@/constants/theme';
import { useBookings } from '@/hooks/use-bookings';
import { useReloadOnTabReset, useTabResetSource } from '@/hooks/use-tab-reset';
import { useNow } from '@/hooks/use-now';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';
import { PromoBanners } from '@/components/home/promo-banners';
import { QuickActions } from '@/components/home/quick-actions';
import { DestinationShowcase } from '@/components/home/destination-showcase';
import { getAirports, getPromotions } from '@/services/api/catalog';
import i18n from '@/i18n';
import { formatDayMonth, formatTime, vnDateOf, weekdayName } from '@/utils/datetime';
import { tripsForTab } from '@/utils/trips';

const POPULAR = ['HAN', 'DAD', 'PQC', 'SGN', 'CXR', 'DLI'];
/** "Còn 1 ngày 3 giờ" / "1 d 3 h left", in the chosen language. */
function countdown(departureAt: string, now: number) {
  const minutes = Math.floor((Date.parse(departureAt) - now) / 60000);
  if (minutes <= 0) return i18n.t('home.soon');
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return i18n.t('home.inDaysHours', { days, hours });
  return hours > 0
    ? i18n.t('home.inHoursMinutes', { hours, minutes: minutes % 60 })
    : i18n.t('home.inMinutes', { minutes });
}

const CARD_COLORS = ['#0E7490', '#C2410C', '#15803D', '#7C3AED', '#BE185D', '#0F766E'];

export default function HomeScreen() {
  const theme = useTheme();
  const unread = useUnreadCount();
  const { t } = useTranslation();
  const { user } = useSession();
  const [destinations, setDestinations] = useState<Api.Airport[]>([]);
  // City photos by airport code: banners of a destination use them as their picture.
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [promotions, setPromotions] = useState<Api.Promotion[]>([]);
  const now = useNow(false);
  const {
    items: bookings,
    loading: bookingsLoading,
    error: bookingsError,
    reload: reloadBookings,
  } = useBookings();
  useTabResetSource('home');
  useReloadOnTabReset(reloadBookings);
  // The nearest paid trip that has not left yet.
  const next = tripsForTab(bookings, 'upcoming', now).find(
    (b) => b.status === 'CONFIRMED' || b.status === 'CANCEL_REQUESTED',
  );

  useEffect(() => {
    let alive = true;
    getAirports()
      .then((list) => {
        if (!alive) return;
        const popular = POPULAR.map((code) => list.find((a) => a.code === code)).filter(
          (a): a is Api.Airport => !!a,
        );
        setDestinations(popular.length > 0 ? popular : list.slice(0, 4));
        setPhotos(
          Object.fromEntries(list.flatMap((a) => (a.imageUrl ? [[a.code, a.imageUrl]] : []))),
        );
      })
      .catch(() => {
        // The destination cards are optional; the search box still works.
      });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getPromotions(controller.signal)
      .then(setPromotions)
      .catch(() => {
        // Banners and offers are optional; the rest of Home still works without them.
      });
    return () => controller.abort();
  }, []);

  const banners = promotions.filter((p) => p.kind === 'BANNER');
  const givenName = user?.fullName.trim().split(/\s+/).pop() ?? '';

  return (
    <View style={styles.flex}>
      <Screen>
        <View style={styles.header}>
          <View style={[styles.logo, { backgroundColor: theme.primary }]}>
            <MaterialCommunityIcons name="airplane" size={23} color={theme.onPrimary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="h2">{t('home.greeting', { name: givenName })}</AppText>
            <AppText variant="caption" tone="textMuted">
              {t('home.prompt')}
            </AppText>
          </View>
          <HeaderAction
            icon="bell"
            label={unread > 0 ? t('inbox.openUnread', { count: unread }) : t('inbox.open')}
            count={unread}
            onPress={() => router.push('/notifications')}
          />
          <Avatar user={user} size={44} />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('home.searchFlights')}
          onPress={() => router.push('/search')}
          style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="search" size={20} color={theme.textMuted} />
          <AppText tone="textMuted">{t('home.searchFlights')}</AppText>
        </Pressable>

        {next ? (
          <View style={[styles.next, { backgroundColor: theme.primary }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('home.nextTripLabel', {
                from: next.flight.origin,
                to: next.flight.destination,
              })}
              onPress={() => router.push({ pathname: '/trips/[id]', params: { id: next.id } })}
              style={styles.nextInfo}>
              <View style={styles.nextTop}>
                <AppText variant="label" style={[styles.nextLabel, { color: theme.onPrimary }]}>
                  {t('home.nextTrip')}
                </AppText>
                <AppText variant="label" style={[styles.nextLabel, { color: theme.onPrimary }]}>
                  {next.bookingCode}
                </AppText>
              </View>
              <AppText style={[styles.nextRoute, { color: theme.onPrimary }]}>
                {next.flight.origin} → {next.flight.destination}
              </AppText>
              <AppText variant="small" style={[styles.nextLabel, { color: theme.onPrimary }]}>
                {weekdayName(vnDateOf(next.flight.departureAt))},{' '}
                {formatDayMonth(vnDateOf(next.flight.departureAt))} ·{' '}
                {formatTime(next.flight.departureAt)} ·{' '}
                {t('common.guests', { count: next.seatCount })}
              </AppText>
            </Pressable>
            <View style={styles.nextFoot}>
              <View style={styles.countPill}>
                <AppText variant="caption" style={{ color: theme.onPrimary, fontWeight: '700' }}>
                  {countdown(next.flight.departureAt, now)}
                </AppText>
              </View>
              {next.status === 'CONFIRMED' ? (
                <Button
                  size="sm"
                  variant="inverse"
                  icon="qrcode"
                  label={t('home.viewQr')}
                  onPress={() =>
                    router.push({ pathname: '/trips/[id]/ticket', params: { id: next.id } })
                  }
                />
              ) : null}
            </View>
          </View>
        ) : !bookingsLoading && !bookingsError ? (
          // Only once the list really loaded empty: a slow or failed load must not read as "no trips".
          <View
            style={[
              styles.next,
              styles.noTrip,
              { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            ]}>
            <View style={[styles.noTripIcon, { backgroundColor: theme.primarySoft }]}>
              <Feather name="map" size={22} color={theme.primary} />
            </View>
            <View style={styles.noTripText}>
              <AppText variant="bodyBold">{t('home.noTrip')}</AppText>
              <AppText variant="caption" tone="textMuted">
                {t('home.noTripText')}
              </AppText>
            </View>
            <Button
              size="sm"
              label={t('home.bookNow')}
              onPress={() => router.push('/search')}
              style={styles.noTripButton}
            />
          </View>
        ) : null}

        <QuickActions />
        <PromoBanners items={banners} photos={photos} />

        {destinations.length > 0 ? (
          <>
            <AppText variant="bodyBold" style={styles.title}>
              {t('home.popular')}
            </AppText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cards}
              style={styles.cardsScroll}>
              {destinations.map((airport, i) => (
                <Pressable
                  key={airport.code}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.searchTo', { city: airport.city })}
                  onPress={() => router.push({ pathname: '/search', params: { to: airport.code } })}
                  style={[styles.card, { backgroundColor: CARD_COLORS[i % CARD_COLORS.length] }]}>
                  {airport.imageUrl ? (
                    <>
                      <Image
                        source={{ uri: airport.imageUrl }}
                        accessibilityLabel={t('home.photoOf', { city: airport.city })}
                        contentFit="cover"
                        transition={200}
                        style={styles.photo}
                      />
                      <View style={styles.shade} />
                    </>
                  ) : null}
                  <View style={styles.code}>
                    <AppText variant="caption" style={styles.codeText}>
                      {airport.code}
                    </AppText>
                  </View>
                  <View>
                    <AppText variant="bodyBold" style={styles.city}>
                      {airport.city}
                    </AppText>
                    <AppText variant="caption" style={styles.cta}>
                      {t('home.viewFlights')}
                    </AppText>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <DestinationShowcase destinations={destinations} />
      </Screen>
      <AssistantFab />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  logo: { width: 46, height: 46, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    marginTop: 20,
    height: 54,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  next: { marginTop: 20, borderRadius: Radius.xl, padding: 18, gap: 12 },
  noTrip: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 12 },
  noTripIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noTripText: { flex: 1, gap: 2 },
  noTripButton: { minWidth: 104 },
  nextInfo: { gap: 4 },
  nextFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  countPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: Radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  nextTop: { flexDirection: 'row', justifyContent: 'space-between' },
  nextLabel: { opacity: 0.9 },
  nextRoute: { fontSize: 26, lineHeight: 34, fontWeight: '800', letterSpacing: -0.4 },
  title: { marginTop: 28, fontSize: 17 },
  cardsScroll: { marginHorizontal: -20 },
  cards: { gap: 12, paddingHorizontal: 20, paddingTop: 12 },
  card: {
    width: 150,
    height: 150,
    borderRadius: Radius.lg,
    padding: 14,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  // The photo fills the card; the shade keeps the white text readable on bright pictures.
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0,0,0,0.32)',
  },
  code: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  codeText: { color: '#ffffff', fontWeight: '700' },
  city: { color: '#ffffff', fontSize: 17 },
  cta: { color: 'rgba(255,255,255,0.85)' },
});
