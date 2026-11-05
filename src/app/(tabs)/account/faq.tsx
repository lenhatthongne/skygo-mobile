import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useRemoteList } from '@/hooks/use-remote-list';
import { useTheme } from '@/hooks/use-theme';
import { getFaqs } from '@/services/api/support';
import { errorMessage } from '@/utils/error-messages';
import { fold } from '@/utils/text';

const ALL = '__all__';

export default function FaqScreen() {
  const theme = useTheme();
  const { items, loading, error, reload } = useRemoteList(getFaqs);
  const [category, setCategory] = useState(ALL);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<number | null>(null);

  const categories = items ? [...new Set(items.map((f) => f.category))] : [];
  const q = fold(query.trim());
  const visible = (items ?? [])
    .filter((f) => category === ALL || f.category === category)
    .filter((f) => !q || fold(f.question).includes(q) || fold(f.answer).includes(q))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <Screen header={{ title: 'Câu hỏi thường gặp', onBack: () => router.back() }}>
      <View style={styles.stack}>
        <View style={[styles.search, { backgroundColor: theme.backgroundElement }]}>
          <Feather name="search" size={20} color={theme.textMuted} />
          <TextInput
            accessibilityLabel="Tìm câu hỏi"
            value={query}
            onChangeText={setQuery}
            placeholder="Tìm câu hỏi..."
            placeholderTextColor={theme.textMuted}
            style={[styles.input, { color: theme.text }]}
            returnKeyType="search"
          />
        </View>

        {categories.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipsScroll}>
            <Chip tone="dark" label="Tất cả" selected={category === ALL} onPress={() => setCategory(ALL)} />
            {categories.map((c) => (
              <Chip key={c} tone="dark" label={c} selected={category === c} onPress={() => setCategory(c)} />
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <ActivityIndicator style={styles.loader} color={theme.primary} />
        ) : error ? (
          <View style={styles.stack}>
            <Banner tone="error">{errorMessage(error)}</Banner>
            <Button label="Thử lại" onPress={reload} />
          </View>
        ) : visible.length === 0 ? (
          <AppText tone="textSecondary" style={styles.empty}>
            Không tìm thấy câu hỏi phù hợp. Hãy thử từ khóa khác hoặc gửi yêu cầu cho chúng tôi.
          </AppText>
        ) : (
          <View>
            {visible.map((f) => {
              const expanded = open === f.id;
              return (
                <View key={f.id} style={[styles.item, { borderColor: theme.border }]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ expanded }}
                    onPress={() => setOpen(expanded ? null : f.id)}
                    style={styles.question}>
                    <AppText variant="bodyBold" style={styles.flex}>
                      {f.question}
                    </AppText>
                    <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={22} color={expanded ? theme.primary : theme.textMuted} />
                  </Pressable>
                  {expanded ? (
                    <AppText tone="textSecondary" style={styles.answer}>
                      {f.answer}
                    </AppText>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/account/support-new')}
          style={[styles.cta, { backgroundColor: theme.primarySoft, borderColor: theme.primary }]}>
          <View style={[styles.ctaIcon, { backgroundColor: theme.background }]}>
            <Feather name="message-square" size={22} color={theme.primary} />
          </View>
          <View style={styles.flex}>
            <AppText variant="bodyBold">Chưa có câu trả lời?</AppText>
            <AppText variant="small" tone="textSecondary">
              Gửi yêu cầu, chúng tôi phản hồi qua ứng dụng.
            </AppText>
          </View>
          <Feather name="chevron-right" size={20} color={theme.primary} />
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: 14, paddingTop: 8 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: Radius.lg, paddingHorizontal: 16, height: 52 },
  input: { flex: 1, fontSize: 15, height: 52 },
  chipsScroll: { marginHorizontal: -20 },
  chips: { gap: 8, paddingHorizontal: 20 },
  loader: { marginTop: 40 },
  empty: { paddingVertical: 24 },
  item: { borderBottomWidth: 1 },
  question: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingVertical: 12 },
  answer: { paddingBottom: 16, paddingRight: 8 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: Radius.xl, borderWidth: 1, marginTop: 12 },
  ctaIcon: { width: 48, height: 48, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
});
