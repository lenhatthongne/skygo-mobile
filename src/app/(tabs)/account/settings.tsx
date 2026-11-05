import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ListCard, ListRow, ListSection } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Segmented } from '@/components/ui/segmented';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setAssistantFabHidden, useAssistantFabHidden } from '@/services/assistant-fab-store';
import {
  disableFlightReminders,
  enableFlightReminders,
  loadRemindersEnabled,
  reminderPermission,
  serverRemindersOn,
  syncFlightReminders,
} from '@/services/flight-reminders';
import { listBookings } from '@/services/api/bookings';
import { clearOfflineData, ticketSummary } from '@/services/offline-store';
import {
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
} from '@/services/settings-store';
import { formatDateTime } from '@/utils/datetime';

const THEMES: { value: ThemePreference; labelKey: 'themeLight' | 'themeDark' | 'themeSystem' }[] = [
  { value: 'light', labelKey: 'themeLight' },
  { value: 'dark', labelKey: 'themeDark' },
  { value: 'system', labelKey: 'themeSystem' },
];


export default function SettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const [preference, setPreference] = useState<ThemePreference>('system');
  const [saved, setSaved] = useState<{ count: number; syncedAt: string | null } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const fabHidden = useAssistantFabHidden();
  // Flight reminders: on only when the customer wants them AND the phone allows notifications.
  const [reminders, setReminders] = useState<{ on: boolean; allowed: boolean } | null>(null);
  // An admin switch: while on, the server sends the reminders as push notifications.
  const [serverOn, setServerOn] = useState(false);

  const refreshReminders = useCallback(async () => {
    const [enabled, permission, server] = await Promise.all([
      loadRemindersEnabled(),
      reminderPermission(),
      serverRemindersOn(),
    ]);
    setServerOn(server);
    setReminders({
      on: enabled && permission.status === 'granted',
      allowed: permission.status === 'granted',
    });
  }, []);

  // Also refresh when coming back from the phone's settings.
  useFocusEffect(
    useCallback(() => {
      void refreshReminders();
    }, [refreshReminders]),
  );

  async function toggleReminders(next: boolean) {
    if (next) {
      const ok = await enableFlightReminders();
      if (ok) {
        // Schedule right away for the trips already booked.
        const page = await listBookings(0, 50).catch(() => null);
        if (page) await syncFlightReminders(page.content);
      }
    } else {
      await disableFlightReminders();
    }
    await refreshReminders();
  }

  useEffect(() => {
    void loadThemePreference().then(setPreference);
    void ticketSummary().then(setSaved);
  }, []);

  function choose(value: ThemePreference) {
    setPreference(value);
    void saveThemePreference(value);
  }

  async function clearData() {
    await clearOfflineData();
    setSaved({ count: 0, syncedAt: null });
    setConfirming(false);
  }

  const themeOptions = THEMES.map((o) => ({ value: o.value, label: t(`settings.${o.labelKey}`) }));

  return (
    <Screen header={{ title: t('settings.title'), onBack: () => router.back() }}>
      <View style={styles.stack}>
        <ListSection title={t('settings.sectionDisplay')} />
        <View
          style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <AppText variant="bodyBold" style={styles.label}>
            {t('settings.themeTitle')}
          </AppText>
          <Segmented options={themeOptions} value={preference} onChange={choose} />
        </View>

        <ListSection title={t('settings.sectionNotifications')} />
        <ListCard>
          <ListRow
            icon="bell"
            title={t('settings.reminders')}
            text={
              !reminders
                ? undefined
                : reminders.on && serverOn
                  ? t('settings.remindersServer')
                  : reminders.on
                    ? t('settings.remindersOn')
                    : reminders.allowed
                      ? t('settings.remindersOff')
                      : t('settings.remindersDenied')
            }
            right={
              <Switch
                accessibilityLabel={t('settings.reminders')}
                value={reminders?.on ?? false}
                disabled={!reminders}
                onValueChange={(v) => void toggleReminders(v)}
                trackColor={{ true: theme.primary }}
              />
            }
          />
          <ListRow
            icon="map-pin"
            title={t('settings.location')}
            text={t('settings.locationHint')}
            onPress={() => void Linking.openSettings().catch(() => undefined)}
          />
        </ListCard>

        <ListSection title={t('settings.sectionAssistantData')} />
        <ListCard>
          <ListRow
            icon="message-circle"
            title={t('settings.fabTitle')}
            text={fabHidden ? t('settings.fabOffHint') : t('settings.fabOnHint')}
            right={
              <Switch
                accessibilityLabel={t('settings.fabTitle')}
                value={!fabHidden}
                onValueChange={(v) => void setAssistantFabHidden(!v)}
                trackColor={{ true: theme.primary }}
              />
            }
          />
          <ListRow
            icon="download"
            title={t('settings.savedTickets')}
            text={
              saved && saved.count > 0
                ? t('settings.savedSummary', {
                    count: saved.count,
                    syncedAt: saved.syncedAt ? formatDateTime(saved.syncedAt) : '',
                  })
                : t('settings.savedNone')
            }
          />
          <ListRow
            icon="trash-2"
            title={t('settings.clearData')}
            text={t('settings.clearDataHint')}
            danger
            onPress={() => setConfirming(true)}
          />
        </ListCard>
      </View>

      <ConfirmDialog
        visible={confirming}
        destructive
        title={t('settings.clearDataTitle')}
        message={t('settings.clearDataMessage')}
        confirmLabel={t('settings.clearConfirm')}
        onConfirm={() => void clearData()}
        onCancel={() => setConfirming(false)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { paddingTop: 4 },
  card: { borderWidth: 1, borderRadius: Radius.xl, padding: 12 },
  label: { marginBottom: 8, marginLeft: 2 },
  labelGap: { marginTop: 14 },
  hint: { paddingTop: 10, paddingHorizontal: 4 },
});
