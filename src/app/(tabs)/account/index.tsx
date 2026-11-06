import { Feather } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { type ComponentRef, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AssistantIcon } from '@/components/assistant/assistant-icon';
import { AppText } from '@/components/ui/app-text';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListCard, ListRow, ListSection } from '@/components/ui/list-row';
import { BottomTabInset, MaxContentWidth, Radius } from '@/constants/theme';
import { useBookings } from '@/hooks/use-bookings';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useSavedPassengers } from '@/hooks/use-saved-passengers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useReloadOnTabReset, useScrollToTopOnTabReset } from '@/hooks/use-tab-reset';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';
import { listMyVouchers } from '@/services/api/vouchers';
import { profileCompletion } from '@/utils/profile';
import { formatPhoneDisplay } from '@/utils/validators';

const loadUsableVouchers = (signal: AbortSignal) => listMyVouchers(false, signal);

export default function AccountScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { user, signOut } = useSession();
  const {
    items: savedItems,
    reload: reloadSaved,
    refresh: refreshSaved,
    refreshing: savedRefreshing,
  } = useSavedPassengers();
  const {
    items: voucherItems,
    reload: reloadVouchers,
    refresh: refreshVouchers,
    refreshing: vouchersRefreshing,
  } = useRemoteList(loadUsableVouchers);
  const trips = useBookings();
  const reloadTrips = trips.reload;
  const [confirming, setConfirming] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // The counts can change in the screens opened from here.
  const reloadAll = useCallback(() => {
    reloadSaved();
    reloadVouchers();
    reloadTrips();
  }, [reloadSaved, reloadVouchers, reloadTrips]);
  useRefreshOnFocus(reloadAll);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  useScrollToTopOnTabReset(scroll);
  useReloadOnTabReset(reloadAll);
  const refreshing = trips.refreshing || savedRefreshing || vouchersRefreshing;
  function pullToRefresh() {
    refreshSaved();
    refreshVouchers();
    trips.refresh();
  }

  async function confirmSignOut() {
    setSigningOut(true);
    await signOut();
  }

  const completion = profileCompletion(user);
  const salutation = user?.title
    ? t(`profile.${user.title.toLowerCase() as 'mr' | 'mrs' | 'ms'}`)
    : '';
  const tripCount = trips.loading ? undefined : `${trips.items.length}${trips.hasMore ? '+' : ''}`;

  return (
    <View
      style={[styles.root, { backgroundColor: theme.backgroundElement, paddingTop: insets.top }]}>
      <View style={[styles.head, { backgroundColor: theme.background }]}>
        <View style={styles.inner}>
          <AppText variant="h1" style={styles.title}>
            {t('account.title')}
          </AppText>
        </View>
      </View>

      <ScrollView
        ref={scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + BottomTabInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={pullToRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }>
        <View style={styles.inner}>
          <View style={[styles.profile, { backgroundColor: theme.background }]}>
            <Avatar user={user} size={72} />
            <AppText variant="h2" numberOfLines={1} style={styles.name}>
              {[salutation, user?.fullName].filter(Boolean).join(' ')}
            </AppText>
            <AppText variant="small" tone="textMuted" numberOfLines={1}>
              {user?.email}
              {user?.phone ? ` · ${formatPhoneDisplay(user.phone)}` : ''}
            </AppText>
            <View style={styles.badges}>
              {user?.emailVerified ? (
                <View style={[styles.pill, { backgroundColor: theme.successSoft }]}>
                  <Feather name="check-circle" size={14} color={theme.success} />
                  <AppText variant="caption" tone="success" style={styles.pillText}>
                    {t('account.emailVerified')}
                  </AppText>
                </View>
              ) : null}
              {completion < 100 ? (
                <View style={[styles.pill, { backgroundColor: theme.primarySoft }]}>
                  <AppText variant="caption" tone="primaryDark" style={styles.pillText}>
                    {t('account.completion', { percent: completion })}
                  </AppText>
                </View>
              ) : null}
            </View>
            <Button
              size="sm"
              variant="outline"
              icon="account-edit-outline"
              label={t('account.editProfile')}
              onPress={() => router.push('/account/profile')}
              style={styles.edit}
            />
          </View>

          <View style={styles.stats}>
            <Stat
              label={t('account.statTrips')}
              value={tripCount}
              onPress={() => router.navigate('/trips')}
            />
            <Stat
              label={t('account.statVouchers')}
              value={voucherItems ? String(voucherItems.length) : undefined}
              onPress={() => router.push('/account/vouchers')}
            />
            <Stat
              label={t('account.statPassengers')}
              value={savedItems ? String(savedItems.length) : undefined}
              onPress={() => router.push('/account/passengers')}
            />
          </View>

          <ListSection title={t('account.sectionServices')} />
          <ListCard>
            <ListRow
              icon="users"
              title={t('account.savedPassengers')}
              meta={savedItems ? String(savedItems.length) : undefined}
              onPress={() => router.push('/account/passengers')}
            />
            <ListRow
              icon="percent"
              title={t('account.myVouchers')}
              meta={voucherItems ? String(voucherItems.length) : undefined}
              onPress={() => router.push('/account/vouchers')}
            />
            <ListRow
              icon="credit-card"
              title={t('account.paymentHistory')}
              onPress={() => router.push('/account/payments')}
            />
            <ListRow
              icon="tag"
              title={t('account.myTrips')}
              onPress={() => router.navigate('/trips')}
            />
          </ListCard>

          <ListSection title={t('account.sectionSecurity')} />
          <ListCard>
            <ListRow
              icon="lock"
              title={t('account.changePassword')}
              onPress={() => router.push('/account/change-password')}
            />
          </ListCard>

          <ListSection title={t('account.sectionSupport')} />
          <ListCard>
            <ListRow
              iconNode={<AssistantIcon size={36} />}
              title={t('account.assistant')}
              onPress={() => router.push('/assistant')}
            />
            <ListRow
              icon="help-circle"
              title={t('account.faq')}
              onPress={() => router.push('/account/faq')}
            />
            <ListRow
              icon="message-circle"
              title={t('account.supportRequests')}
              onPress={() =>
                router.push({ pathname: '/notifications', params: { tab: 'messages' } })
              }
            />
          </ListCard>

          <ListSection title={t('account.sectionApp')} />
          <ListCard>
            <ListRow
              icon="settings"
              title={t('account.settings')}
              text={t('account.settingsHint')}
              onPress={() => router.push('/account/settings')}
            />
          </ListCard>

          <View style={styles.signOut}>
            <ListCard>
              <ListRow
                icon="log-out"
                title={t('account.signOut')}
                danger
                onPress={() => setConfirming(true)}
              />
            </ListCard>
          </View>

          <AppText variant="caption" tone="textMuted" style={styles.version}>
            {t('account.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
          </AppText>
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={confirming}
        destructive
        loading={signingOut}
        title={t('account.signOutTitle')}
        message={t('account.signOutMessage')}
        confirmLabel={t('account.signOut')}
        onConfirm={() => void confirmSignOut()}
        onCancel={() => setConfirming(false)}
      />
    </View>
  );
}

function Stat({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value ?? ''}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.stat,
        { backgroundColor: theme.background, opacity: pressed ? 0.8 : 1 },
      ]}>
      <AppText variant="h2" tone="primary">
        {value ?? '–'}
      </AppText>
      <AppText variant="caption" tone="textMuted">
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  head: { paddingHorizontal: 20, paddingBottom: 14 },
  title: { paddingTop: 12 },
  content: { padding: 16 },
  profile: { borderRadius: Radius.xl, padding: 18, alignItems: 'center', gap: 4 },
  name: { marginTop: 8 },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  pillText: { fontWeight: '700' },
  edit: { alignSelf: 'stretch', marginTop: 12 },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: 12,
    alignItems: 'center',
    minHeight: 64,
  },
  signOut: { marginTop: 14 },
  version: { textAlign: 'center', marginTop: 16 },
});
