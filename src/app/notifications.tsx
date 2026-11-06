import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { reminderPermission } from '@/services/flight-reminders';
import { useTheme } from '@/hooks/use-theme';
import {
  type InboxItem,
  markAllRead,
  markRead,
  useInboxItems,
  useUnreadCount,
} from '@/services/notification-inbox';
import { formatDateTime, todayVn, vnDateOf } from '@/utils/datetime';

const HOUR_MS = 3600_000;

/** The notifications this phone received: newest first, "Hôm nay" and "Trước đó", unread marked. */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const items = useInboxItems();
  const unread = useUnreadCount();
  const now = useNow(true, 30_000);
  // null until known; false when the phone blocks notifications for SkyGo.
  const [systemOn, setSystemOn] = useState<boolean | null>(null);

  // Checked every time the screen is shown, so coming back from the phone's settings updates it.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      void reminderPermission()
        .then((p) => alive && setSystemOn(p.status === 'granted'))
        .catch(() => undefined);
      return () => {
        alive = false;
      };
    }, []),
  );

  const today = todayVn();
  const todayItems = items.filter((i) => vnDateOf(i.at) === today);
  const earlierItems = items.filter((i) => vnDateOf(i.at) !== today);

  function open(item: InboxItem) {
    markRead(item.id);
    router.push({ pathname: '/trips/[id]', params: { id: item.bookingId } });
  }

  function ago(iso: string) {
    const diff = now - Date.parse(iso);
    if (diff < 60_000) return t('inbox.justNow');
    if (diff < HOUR_MS) return t('inbox.minutesAgo', { count: Math.floor(diff / 60_000) });
    if (diff < 6 * HOUR_MS) return t('inbox.hoursAgo', { count: Math.floor(diff / HOUR_MS) });
    return formatDateTime(iso);
  }

  const renderGroup = (label: string, list: InboxItem[]) =>
    list.length === 0 ? null : (
      <View style={styles.group}>
        <AppText variant="label" tone="textMuted" style={styles.groupLabel}>
          {label}
        </AppText>
        {list.map((item) => {
          const confirmed = item.type === 'BOOKING_CONFIRMED';
          const tint = confirmed ? theme.success : theme.warning;
          const soft = confirmed ? theme.successSoft : theme.warningSoft;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`${item.read ? '' : `${t('inbox.unread')}. `}${item.title}. ${item.body}`}
              onPress={() => open(item)}
              style={[
                styles.row,
                {
                  backgroundColor: item.read ? theme.background : theme.primarySoft,
                  borderColor: item.read ? theme.border : theme.primary,
                },
              ]}>
              <View style={[styles.icon, { backgroundColor: soft }]}>
                <Feather name={confirmed ? 'check-circle' : 'clock'} size={20} color={tint} />
              </View>
              <View style={styles.text}>
                <View style={styles.titleRow}>
                  <AppText variant="bodyBold" style={styles.title} numberOfLines={2}>
                    {item.title}
                  </AppText>
                  {!item.read ? (
                    <View style={[styles.dot, { backgroundColor: theme.danger }]} />
                  ) : null}
                </View>
                <AppText variant="small" tone="textSecondary" numberOfLines={3}>
                  {item.body}
                </AppText>
                <AppText variant="caption" tone="textMuted">
                  {ago(item.at)}
                </AppText>
              </View>
            </Pressable>
          );
        })}
      </View>
    );

  return (
    <Screen header={{ title: t('inbox.title'), onBack: () => router.back() }}>
      {systemOn === false ? (
        <View
          style={[
            styles.system,
            { backgroundColor: theme.warningSoft, borderColor: theme.warning },
          ]}>
          <Feather name="bell-off" size={22} color={theme.warning} />
          <View style={styles.text}>
            <AppText variant="bodyBold">{t('inbox.systemOffTitle')}</AppText>
            <AppText variant="small" tone="textSecondary">
              {t('inbox.systemOffText')}
            </AppText>
          </View>
          <Button
            size="sm"
            label={t('inbox.openSettings')}
            onPress={() => void Linking.openSettings().catch(() => undefined)}
            style={styles.systemButton}
          />
        </View>
      ) : null}
      {items.length === 0 ? (
        <View style={styles.empty}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
            <Feather name="bell" size={30} color={theme.primary} />
          </View>
          <AppText variant="h2" style={styles.center}>
            {t('inbox.emptyTitle')}
          </AppText>
          <AppText tone="textSecondary" style={styles.center}>
            {t('inbox.emptyText')}
          </AppText>
        </View>
      ) : (
        <>
          {unread > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={markAllRead}
              hitSlop={8}
              style={styles.markAll}>
              <AppText variant="smallBold" tone="primaryDark">
                {t('inbox.markAll')}
              </AppText>
            </Pressable>
          ) : null}
          {renderGroup(t('inbox.today'), todayItems)}
          {renderGroup(t('inbox.earlier'), earlierItems)}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  system: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginTop: 4,
  },
  systemButton: { minWidth: 100 },
  group: { gap: 10, marginTop: 8 },
  groupLabel: { marginLeft: 2, marginTop: 8 },
  markAll: { alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  row: {
    flexDirection: 'row',
    gap: 12,
    padding: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 44,
  },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 80, paddingHorizontal: 24 },
  emptyIcon: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  center: { textAlign: 'center' },
});
