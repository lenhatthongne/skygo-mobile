import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ComponentRef, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AirportsMap } from '@/components/airports/airports-map';
import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { BottomTabInset, Radius } from '@/constants/theme';
import { useRemoteList } from '@/hooks/use-remote-list';
import {
  useReloadOnTabReset,
  useScrollToTopOnTabReset,
  useTabResetSource,
} from '@/hooks/use-tab-reset';
import { useTheme } from '@/hooks/use-theme';
import { useUserLocation } from '@/hooks/use-user-location';
import { getAirports } from '@/services/api/catalog';
import { errorMessage } from '@/utils/error-messages';
import { distanceKm, formatKm } from '@/utils/geo';
import { fold } from '@/utils/text';

const loadAirports = (_signal: AbortSignal) => getAirports();

function directionsUrl(a: Api.Airport) {
  const { latitude: lat, longitude: lng } = a;
  if (Platform.OS === 'ios')
    return `http://maps.apple.com/?daddr=${lat},${lng}&q=${encodeURIComponent(a.name)}`;
  if (Platform.OS === 'android')
    return `geo:${lat},${lng}?q=${lat},${lng}(${encodeURIComponent(a.name)})`;
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export default function ExploreScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { items, loading, error, reload } = useRemoteList(loadAirports);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useTabResetSource('explore');
  useScrollToTopOnTabReset(scroll);
  useReloadOnTabReset(reload);
  const location = useUserLocation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  const q = fold(query.trim());
  const rows = (items ?? [])
    .map((a) => ({ airport: a, km: location.coords ? distanceKm(location.coords, a) : null }))
    .filter(
      ({ airport: a }) =>
        !q || fold(a.name).includes(q) || fold(a.city).includes(q) || fold(a.code).includes(q),
    )
    .sort((a, b) =>
      a.km !== null && b.km !== null
        ? a.km - b.km
        : a.airport.city.localeCompare(b.airport.city, 'vi'),
    );
  const nearest = location.coords ? rows[0]?.airport.code : undefined;

  const locating = location.state === 'locating';

  return (
    <View style={[styles.root, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.map}>
        <AirportsMap
          airports={items ?? []}
          selectedCode={selected}
          user={location.coords}
          onSelect={setSelected}
        />
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <View style={[styles.search, { backgroundColor: theme.background }]}>
            <Feather name="search" size={20} color={theme.textMuted} />
            <TextInput
              accessibilityLabel={t('explore.searchLabel')}
              value={query}
              onChangeText={setQuery}
              placeholder={t('explore.searchPlaceholder')}
              placeholderTextColor={theme.textMuted}
              style={[styles.input, { color: theme.text }]}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('explore.useLocation')}
            disabled={locating}
            onPress={() => void location.locate()}
            style={[styles.locate, { backgroundColor: theme.background }]}>
            {locating ? (
              <ActivityIndicator color={theme.primary} />
            ) : (
              <Feather
                name="crosshair"
                size={22}
                color={location.coords ? theme.primary : theme.textSecondary}
              />
            )}
          </Pressable>
        </View>
      </View>

      {/* Android's tab bar sits below this screen, so no extra bottom room is needed there (adding it
          shrank the list and cut the last rows). iOS draws the screen under its floating tab bar. */}
      <View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.background,
            paddingBottom: Platform.OS === 'android' ? 8 : insets.bottom + BottomTabInset,
          },
        ]}>
        <View style={styles.sheetHead}>
          <AppText variant="h2">
            {location.coords ? t('explore.nearYou') : t('explore.allAirports')}
          </AppText>
          <AppText variant="small" tone="textMuted">
            {location.coords
              ? t('explore.byLocation')
              : t('explore.airportCount', { count: items?.length ?? 0 })}
          </AppText>
        </View>

        {location.state === 'denied' ? (
          <Banner tone="info">{t('explore.permissionDenied')}</Banner>
        ) : location.state === 'unavailable' ? (
          <Banner tone="warning">{t('explore.locationFailed')}</Banner>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.primary} />
        ) : error ? (
          <View style={styles.errorBox}>
            <Banner tone="error">{errorMessage(error)}</Banner>
            <Button label={t('explore.retry')} onPress={reload} />
          </View>
        ) : rows.length === 0 ? (
          <AppText tone="textSecondary" style={styles.empty}>
            {t('explore.none')}
          </AppText>
        ) : (
          <ScrollView
            ref={scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.list}>
            {rows.map(({ airport: a, km }) => {
              const open = a.code === selected;
              return (
                <View
                  key={a.code}
                  style={[
                    styles.row,
                    open && {
                      borderColor: theme.primary,
                      backgroundColor: theme.background,
                      borderWidth: 1.5,
                    },
                  ]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    onPress={() => setSelected(open ? null : a.code)}
                    style={styles.rowTop}>
                    <View style={[styles.icon, { backgroundColor: theme.backgroundElement }]}>
                      <Feather name="send" size={20} color={theme.textSecondary} />
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="bodyBold">
                        {a.name} · {a.code}
                      </AppText>
                      <AppText variant="small" tone="textMuted">
                        {a.city}
                        {km !== null ? ` · ${formatKm(km)}` : ''}
                      </AppText>
                    </View>
                    {a.code === nearest ? (
                      <View style={[styles.tag, { backgroundColor: theme.primarySoft }]}>
                        <AppText variant="label" tone="primaryDark">
                          {t('explore.nearest')}
                        </AppText>
                      </View>
                    ) : (
                      <Feather
                        name={open ? 'chevron-up' : 'chevron-right'}
                        size={20}
                        color={theme.textMuted}
                      />
                    )}
                  </Pressable>
                  {open ? (
                    <View style={styles.actions}>
                      <Button
                        label={t('explore.directions')}
                        variant="outline"
                        style={styles.action}
                        onPress={() =>
                          void Linking.openURL(directionsUrl(a)).catch(() => undefined)
                        }
                      />
                      <Button
                        label={t('explore.flyFrom')}
                        style={styles.action}
                        onPress={() =>
                          router.push({ pathname: '/search', params: { from: a.code } })
                        }
                      />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  map: { flex: 1, minHeight: 200 },
  top: { flexDirection: 'row', gap: 12, paddingHorizontal: 16 },
  search: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: 52,
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
  },
  input: { flex: 1, fontSize: 15, height: 52 },
  locate: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 16,
    paddingHorizontal: 16,
    gap: 10,
  },
  sheetHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  loader: { marginVertical: 30 },
  errorBox: { gap: 12 },
  empty: { paddingVertical: 20 },
  list: { gap: 8, paddingBottom: 8 },
  row: { borderRadius: Radius.xl, borderWidth: 1.5, borderColor: 'transparent', padding: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  icon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tag: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill },
  actions: { flexDirection: 'row', gap: 10, paddingTop: 10 },
  action: { flex: 1, height: 48 },
});
