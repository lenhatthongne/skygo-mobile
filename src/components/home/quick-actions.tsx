import { Feather } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { AssistantIcon } from '@/components/assistant/assistant-icon';
import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Action = {
  labelKey: 'tickets' | 'passengers' | 'support' | 'assistant';
  icon: keyof typeof Feather.glyphMap | 'assistant';
  href: Href;
};

const ACTIONS: Action[] = [
  { labelKey: 'tickets', icon: 'file-text', href: '/trips' },
  { labelKey: 'passengers', icon: 'users', href: '/account/passengers' },
  { labelKey: 'support', icon: 'headphones', href: '/account/support' },
  { labelKey: 'assistant', icon: 'assistant', href: '/assistant' },
];

/** One-tap shortcuts to the places customers return to most. */
export function QuickActions() {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.labelKey}
          accessibilityRole="button"
          accessibilityLabel={t(`home.quick.${a.labelKey}`)}
          onPress={() => router.push(a.href)}
          style={styles.item}>
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            {a.icon === 'assistant' ? (
              <AssistantIcon size={30} />
            ) : (
              <Feather name={a.icon} size={22} color={theme.primaryDark} />
            )}
          </View>
          <AppText variant="caption" tone="textSecondary" numberOfLines={1}>
            {t(`home.quick.${a.labelKey}`)}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  item: { flex: 1, alignItems: 'center', gap: 6, minHeight: 44 },
  icon: {
    width: 52,
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
