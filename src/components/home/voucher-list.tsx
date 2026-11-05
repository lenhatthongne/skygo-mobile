import { Feather } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDate, vnDateOf } from '@/utils/datetime';

import { PROMO_TONES } from './promo-theme';

/**
 * Offers with a code to copy. The code is display-only: the backend does not apply it to a
 * booking price, so the card says nothing about a discount being applied.
 */
export function VoucherList({ items }: { items: Api.Promotion[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const [copied, setCopied] = useState<string | null>(null);

  if (items.length === 0) return null;

  const copy = async (code: string) => {
    try {
      await Clipboard.setStringAsync(code);
      setCopied(code);
      setTimeout(() => setCopied((c) => (c === code ? null : c)), 2000);
    } catch {
      // Copying is a convenience; the code is on screen to read.
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="bodyBold" style={styles.title}>
        {t('home.offersTitle')}
      </AppText>
      {items.map((v) => {
        const tone = PROMO_TONES[v.theme];
        const done = copied === v.code;
        return (
          <View key={v.id} style={[styles.card, { borderColor: theme.primary }]}>
            <View style={[styles.icon, { backgroundColor: theme[tone.bg] }]}>
              <Feather name="tag" size={20} color={theme[tone.fg]} />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyBold" numberOfLines={1}>
                {v.title}
              </AppText>
              <AppText variant="caption" tone="textMuted" numberOfLines={2}>
                {[
                  v.subtitle,
                  v.endsAt ? t('home.expires', { date: formatDate(vnDateOf(v.endsAt)) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </AppText>
            </View>
            {v.code ? (
              <Button
                size="sm"
                variant={done ? 'outline' : 'primary'}
                icon={done ? 'check' : 'content-copy'}
                label={done ? t('home.codeCopied') : v.code}
                onPress={() => void copy(v.code ?? '')}
                style={styles.code}
              />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  wrap: { marginTop: 28, gap: 10 },
  title: { fontSize: 17 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: Radius.lg,
    padding: 12,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // One width for every code, so the buttons line up whatever the code length.
  code: { width: 128 },
});
