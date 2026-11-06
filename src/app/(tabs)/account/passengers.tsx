import { useTranslation } from 'react-i18next';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useSavedPassengers } from '@/hooks/use-saved-passengers';
import { useRefreshOnFocus } from '@/hooks/use-refresh-on-focus';
import { useTheme } from '@/hooks/use-theme';
import { AGE_LABEL, ageClassOn, isoToDob } from '@/utils/age';
import { todayVn } from '@/utils/datetime';
import { errorMessage } from '@/utils/error-messages';

const initials = (fullName: string) => {
  const parts = fullName.trim().split(/\s+/);
  return (
    parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  ).toUpperCase();
};

export default function SavedPassengersScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { items, loading, error, reload, refresh, refreshing } = useSavedPassengers();

  // Refresh after adding, editing or deleting in the form.
  useRefreshOnFocus(reload);

  const header = { title: t('savedPassengers.title'), onBack: () => router.back() };
  const today = todayVn();

  const add = () => router.push('/account/passenger');
  const footer = items ? (
    <Button label={t('savedPassengers.add')} variant="outline" onPress={add} />
  ) : undefined;

  return (
    <Screen header={header} footer={footer} refresh={{ refreshing, onRefresh: refresh }}>
      <View style={styles.stack}>
        <Banner tone="primary" icon="info">
          {t('savedPassengers.intro')}
        </Banner>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.primary} />
        ) : error ? (
          <View style={styles.stack}>
            <Banner tone="error">{errorMessage(error)}</Banner>
            <Button label={t('savedPassengers.retry')} onPress={reload} />
          </View>
        ) : items && items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}>
              <Feather name="users" size={28} color={theme.primary} />
            </View>
            <AppText variant="h2" style={styles.center}>
              {t('savedPassengers.emptyTitle')}
            </AppText>
            <AppText tone="textSecondary" style={styles.center}>
              {t('savedPassengers.emptyText')}
            </AppText>
          </View>
        ) : (
          <>
            <View
              style={[
                styles.card,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}>
              {items?.map((p, i) => (
                <View key={p.id}>
                  {i > 0 ? <View style={[styles.rule, { backgroundColor: theme.border }]} /> : null}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('savedPassengers.edit', { name: p.fullName })}
                    onPress={() =>
                      router.push({
                        pathname: '/account/passenger',
                        params: {
                          id: String(p.id),
                          title: p.title,
                          fullName: p.fullName,
                          dateOfBirth: p.dateOfBirth,
                        },
                      })
                    }
                    style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
                    <View
                      style={[
                        styles.avatar,
                        { backgroundColor: i % 2 ? theme.warningSoft : theme.primarySoft },
                      ]}>
                      <AppText variant="bodyBold" tone={i % 2 ? 'warning' : 'primaryDark'}>
                        {initials(p.fullName)}
                      </AppText>
                    </View>
                    <View style={styles.flex}>
                      <AppText variant="bodyBold">
                        {p.title} {p.fullName}
                      </AppText>
                      <AppText variant="small" tone="textMuted">
                        {AGE_LABEL[ageClassOn(p.dateOfBirth, today)]} · {isoToDob(p.dateOfBirth)}
                      </AppText>
                    </View>
                    <Feather name="edit-2" size={19} color={theme.textMuted} />
                  </Pressable>
                </View>
              ))}
            </View>
            <AppText variant="caption" tone="textMuted" style={styles.note}>
              {t('savedPassengers.ageNote')}
            </AppText>
          </>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 14, paddingTop: 8 },
  loader: { marginTop: 60 },
  card: { borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, minHeight: 72 },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { height: 1, marginLeft: 12 },
  note: { paddingHorizontal: 4 },
  empty: { alignItems: 'center', gap: 10, paddingTop: 48, paddingHorizontal: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});
