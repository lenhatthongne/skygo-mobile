import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { useSearch } from '@/providers/search-provider';
import { getAirports } from '@/services/api/catalog';
import { errorMessage } from '@/utils/error-messages';
import { fold, splitMatch } from '@/utils/text';
import { Screen } from '@/components/ui/screen';

export default function AirportPickerScreen() {
  const theme = useTheme();
  const { field } = useLocalSearchParams<{ field?: 'from' | 'to' }>();
  const target = field === 'from' ? 'from' : 'to';
  const { criteria, setCriteria } = useSearch();
  const [airports, setAirports] = useState<Api.Airport[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let alive = true;
    getAirports()
      .then((list) => alive && setAirports(list))
      .catch((e: unknown) => alive && setError(errorMessage(e)));
    return () => {
      alive = false;
    };
  }, [attempt]);

  const other = target === 'from' ? criteria.to : criteria.from;
  const q = fold(query.trim());
  const visible = (airports ?? []).filter(
    (a) => !q || fold(`${a.city} ${a.name} ${a.code}`).includes(q),
  );

  function choose(airport: Api.Airport) {
    setCriteria((c) => ({ ...c, [target]: airport }));
    router.back();
  }

  return (
    <Screen
      header={{
        title: target === 'from' ? 'Chọn điểm đi' : 'Chọn điểm đến',
        onBack: () => router.back(),
        close: true,
      }}>
      <TextField
        label="Tìm sân bay hoặc thành phố"
        leftIcon="search"
        value={query}
        onChangeText={setQuery}
        autoCorrect={false}
        autoCapitalize="none"
        placeholder="Ví dụ: da nang, SGN"
        returnKeyType="search"
      />

      {error ? (
        <View style={styles.block}>
          <Banner tone="error">{error}</Banner>
          <View style={styles.retry}>
            <Button
              label="Thử lại"
              variant="outline"
              onPress={() => {
                setError(null);
                setAttempt((n) => n + 1);
              }}
            />
          </View>
        </View>
      ) : !airports ? (
        <ActivityIndicator style={styles.block} color={theme.primary} />
      ) : visible.length === 0 ? (
        <View style={styles.block}>
          <AppText tone="textSecondary" style={styles.center}>
            Không tìm thấy sân bay phù hợp với “{query}”.
          </AppText>
        </View>
      ) : (
        <FlatList
          style={styles.block}
          data={visible}
          scrollEnabled={false}
          keyExtractor={(a) => a.code}
          renderItem={({ item }) => {
            const disabled = item.code === other?.code;
            const selected = item.code === criteria[target]?.code;
            const [before, match, after] = splitMatch(item.city, query);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled, selected }}
                disabled={disabled}
                onPress={() => choose(item)}
                style={[styles.row, { borderColor: theme.border, opacity: disabled ? 0.45 : 1 }]}>
                <View style={[styles.icon, { backgroundColor: selected ? theme.primarySoft : theme.backgroundElement }]}>
                  <Feather name="send" size={18} color={selected ? theme.primary : theme.textSecondary} />
                </View>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">
                    {before}
                    <AppText variant="bodyBold" tone="primaryDark">
                      {match}
                    </AppText>
                    {after}
                  </AppText>
                  <AppText variant="caption" tone="textMuted">
                    {item.name}
                    {disabled ? ' · đã chọn ở ô còn lại' : ''}
                  </AppText>
                </View>
                <View style={[styles.code, { backgroundColor: theme.backgroundElement }]}>
                  <AppText variant="smallBold">{item.code}</AppText>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  block: { marginTop: 16 },
  retry: { marginTop: 12 },
  center: { textAlign: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  icon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  code: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});
