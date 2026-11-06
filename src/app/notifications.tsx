import { Feather } from '@expo/vector-icons';
import { router, useFocusEffect, useIsFocused, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutAnimation, Linking, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { SegmentedTabs } from '@/components/inbox/segmented-tabs';
import { ConversationList } from '@/components/support/conversation-list';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useNow } from '@/hooks/use-now';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useRemoteList } from '@/hooks/use-remote-list';
import { listMySupportRequests } from '@/services/api/support';
import { reminderPermission } from '@/services/flight-reminders';
import { useTheme } from '@/hooks/use-theme';
import {
  type InboxItem,
  clearNotifications,
  markAllRead,
  markRead,
  removeNotification,
  setActiveSupportView,
  restoreNotification,
  useInboxItems,
  useUnreadCount,
} from '@/services/notification-inbox';
import { formatDateTime, todayVn, vnDateOf } from '@/utils/datetime';
import { openInboxItem } from '@/utils/notification-target';

const HOUR_MS = 3600_000;
const MESSAGES_POLL_MS = 12_000;

type InboxTab = 'notifications' | 'messages';

const loadConversations = async (signal: AbortSignal) =>
  (await listMySupportRequests(signal)).content;

/** The notifications this phone received: newest first, "Hôm nay" and "Trước đó", unread marked. */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const items = useInboxItems();
  const unread = useUnreadCount();
  const now = useNow(true, 30_000);
  const { tab: tabParam } = useLocalSearchParams<{ tab?: string }>();
  // The chat bubble and the Account row open this screen on Messages; the customer can switch.
  const [chosen, setTab] = useState<InboxTab | null>(null);
  const tab: InboxTab = chosen ?? (tabParam === 'messages' ? 'messages' : 'notifications');
  const focused = useIsFocused();
  const conversations = useRemoteList(loadConversations);
  const reloadList = conversations.reload;

  // Coming back from a conversation refreshes the list and the unread numbers; while Messages is
  // showing, new replies arrive every few seconds.
  const reloadMessages = useCallback(() => {
    reloadList();
  }, [reloadList]);
  useRefreshOnFocus(reloadMessages);
  useEffect(() => {
    if (tab !== 'messages' || !focused) return;
    // The list is on screen, so a reply needs no extra strip over it.
    setActiveSupportView('list');
    const timer = setInterval(reloadMessages, MESSAGES_POLL_MS);
    return () => {
      clearInterval(timer);
      setActiveSupportView(null);
    };
  }, [tab, focused, reloadMessages]);
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

  // The last notification swiped away, kept for a few seconds so it can be brought back.
  const [removed, setRemoved] = useState<InboxItem | null>(null);
  useEffect(() => {
    if (!removed) return;
    const timer = setTimeout(() => setRemoved(null), 5000);
    return () => clearTimeout(timer);
  }, [removed]);

  function open(item: InboxItem) {
    markRead(item.id);
    openInboxItem(item);
  }

  function remove(item: InboxItem) {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (removeNotification(item.id)) setRemoved(item);
  }

  function undo() {
    if (!removed) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    restoreNotification(removed);
    setRemoved(null);
  }

  function clearAll() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    clearNotifications();
    setRemoved(null);
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
          const support = item.type === 'SUPPORT_REPLY';
          const tint = support ? theme.primary : confirmed ? theme.success : theme.warning;
          const soft = support
            ? theme.primarySoft
            : confirmed
              ? theme.successSoft
              : theme.warningSoft;
          return (
            <ReanimatedSwipeable
              key={item.id}
              friction={1.6}
              rightThreshold={72}
              overshootRight={false}
              renderRightActions={() => (
                <View
                  style={[styles.deleteAction, { backgroundColor: theme.danger }]}
                  accessibilityElementsHidden>
                  <Feather name="trash-2" size={22} color="#fff" />
                  <AppText variant="smallBold" style={{ color: '#fff' }}>
                    {t('inbox.delete')}
                  </AppText>
                </View>
              )}
              onSwipeableOpen={() => remove(item)}>
              <Pressable
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
                  <Feather
                    name={support ? 'message-circle' : confirmed ? 'check-circle' : 'clock'}
                    size={20}
                    color={tint}
                  />
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
            </ReanimatedSwipeable>
          );
        })}
      </View>
    );

  return (
    <Screen
      header={{
        title: tab === 'messages' ? t('inbox.messagesTitle') : t('inbox.title'),
        onBack: () => router.back(),
      }}
      refresh={
        tab === 'messages'
          ? { refreshing: conversations.refreshing, onRefresh: conversations.refresh }
          : undefined
      }
      footer={
        tab === 'messages' ? (
          conversations.items && conversations.items.length > 0 ? (
            <Button
              label={t('inbox.newMessage')}
              icon="message-plus-outline"
              onPress={() => router.push('/account/support-new')}
            />
          ) : undefined
        ) : removed ? (
          <View style={[styles.undoBar, { backgroundColor: theme.text }]}>
            <AppText style={{ color: theme.background, flex: 1 }}>{t('inbox.removed')}</AppText>
            <Pressable accessibilityRole="button" hitSlop={8} onPress={undo} style={styles.undoBtn}>
              <AppText variant="bodyBold" style={{ color: theme.primarySoft }}>
                {t('inbox.undo')}
              </AppText>
            </Pressable>
          </View>
        ) : undefined
      }>
      <SegmentedTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { key: 'notifications', label: t('inbox.tabNotifications') },
          { key: 'messages', label: t('inbox.tabMessages') },
        ]}
      />
      {tab === 'messages' ? (
        <ConversationList
          items={conversations.items}
          loading={conversations.loading}
          error={conversations.error}
          onRetry={conversations.reload}
          onNew={() => router.push('/account/support-new')}
        />
      ) : null}
      {tab === 'notifications' && systemOn === false ? (
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
      {tab !== 'notifications' ? null : items.length === 0 ? (
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
          <View style={styles.actionsRow}>
            <AppText variant="caption" tone="textMuted" style={styles.hint}>
              {t('inbox.swipeHint')}
            </AppText>
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
            <Pressable
              accessibilityRole="button"
              onPress={clearAll}
              hitSlop={8}
              style={styles.markAll}>
              <AppText variant="smallBold" tone="danger">
                {t('inbox.clearAll')}
              </AppText>
            </Pressable>
          </View>
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
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hint: { flex: 1 },
  markAll: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  deleteAction: {
    width: 96,
    marginLeft: 8,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    paddingHorizontal: 16,
    minHeight: 52,
  },
  undoBtn: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
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
