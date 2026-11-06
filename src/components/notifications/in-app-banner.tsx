import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type InboxItem, markRead, onNotificationAnnounced } from '@/services/notification-inbox';

const SHOW_MS = 4500;
const SLIDE_FROM = -140;

/**
 * A strip at the top of the screen when a notification arrives while the app is open, on top of the
 * phone's own banner (which shows only when the system allows it). Tapping opens the booking; it
 * also goes away by itself.
 */
export function InAppNotificationBanner() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [item, setItem] = useState<InboxItem | null>(null);
  const [slide] = useState(() => new Animated.Value(0));

  useEffect(() => onNotificationAnnounced(setItem), []);

  useEffect(() => {
    if (!item) return;
    Animated.timing(slide, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    const timer = setTimeout(() => {
      Animated.timing(slide, { toValue: 0, duration: 180, useNativeDriver: true }).start(() =>
        setItem(null),
      );
    }, SHOW_MS);
    return () => clearTimeout(timer);
  }, [item, slide]);

  if (!item) return null;

  const confirmed = item.type === 'BOOKING_CONFIRMED';
  const tint = confirmed ? theme.success : theme.warning;
  const soft = confirmed ? theme.successSoft : theme.warningSoft;

  function close() {
    slide.setValue(0);
    setItem(null);
  }

  function open() {
    if (!item) return;
    markRead(item.id);
    const id = item.bookingId;
    close();
    router.push({ pathname: '/trips/[id]', params: { id } });
  }

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrap,
        {
          top: insets.top + 8,
          opacity: slide,
          transform: [
            { translateY: slide.interpolate({ inputRange: [0, 1], outputRange: [SLIDE_FROM, 0] }) },
          ],
        },
      ]}>
      <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLiveRegion="polite"
          accessibilityLabel={`${item.title}. ${item.body}`}
          onPress={open}
          style={styles.main}>
          <View style={[styles.icon, { backgroundColor: soft }]}>
            <Feather name={confirmed ? 'check-circle' : 'clock'} size={20} color={tint} />
          </View>
          <View style={styles.text}>
            <AppText variant="bodyBold" numberOfLines={1}>
              {item.title}
            </AppText>
            <AppText variant="small" tone="textSecondary" numberOfLines={2}>
              {item.body}
            </AppText>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('inbox.close')}
          hitSlop={8}
          onPress={close}
          style={styles.close}>
          <Feather name="x" size={18} color={theme.textMuted} />
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 1000, elevation: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    minHeight: 64,
  },
  main: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 2 },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});
