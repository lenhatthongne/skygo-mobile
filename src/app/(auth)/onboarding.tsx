import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HERO_NAVY } from '@/components/auth/auth-background';
import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { markOnboardingSeen } from '@/services/onboarding-store';

const PAGES = [
  { key: 'search', icon: 'airplane-takeoff', tint: '#10506A' },
  { key: 'book', icon: 'seat-passenger', tint: '#14405A' },
  { key: 'ticket', icon: 'qrcode-scan', tint: '#0D3550' },
] as const;

/** First launch only: three short pages, then the welcome screen. */
export default function OnboardingScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const list = useRef<FlatList<(typeof PAGES)[number]>>(null);
  const [page, setPage] = useState(0);
  const last = page === PAGES.length - 1;

  async function finish() {
    await markOnboardingSeen();
    router.replace('/welcome');
  }

  function next() {
    if (last) void finish();
    else list.current?.scrollToIndex({ index: page + 1, animated: true });
  }

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));

  return (
    <View style={[styles.root, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <FlatList
        ref={list}
        data={PAGES}
        keyExtractor={(p) => p.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        renderItem={({ item }) => (
          <View style={{ width }}>
            <View style={[styles.art, { height: height * 0.38, backgroundColor: item.tint }]}>
              <View style={styles.tile}>
                <MaterialCommunityIcons name={item.icon} size={64} color="#ffffff" />
              </View>
            </View>
            <View style={styles.text}>
              <AppText variant="h1" style={styles.title}>
                {t(`onboarding.${item.key}`)}
              </AppText>
              <AppText style={styles.body}>{t(`onboarding.${item.key}Body`)}</AppText>
            </View>
          </View>
        )}
      />

      {last ? null : (
        <Pressable
          accessibilityRole="button"
          hitSlop={12}
          onPress={() => void finish()}
          style={[styles.skip, { top: insets.top + 12 }]}>
          <AppText variant="smallBold" style={styles.skipText}>
            {t('onboarding.skip')}
          </AppText>
        </Pressable>
      )}

      <View
        style={styles.dots}
        accessible
        accessibilityLabel={t('onboarding.page', { current: page + 1, total: PAGES.length })}>
        {PAGES.map((p, i) => (
          <View key={p.key} style={[styles.dot, i === page && styles.dotOn]} />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label={last ? t('onboarding.start') : t('onboarding.next')} onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: HERO_NAVY },
  art: { alignItems: 'center', justifyContent: 'center' },
  tile: {
    width: 132,
    height: 132,
    borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { paddingHorizontal: 24, paddingTop: 36, gap: 12 },
  title: { color: '#ffffff', fontSize: 30, lineHeight: 36 },
  body: { color: 'rgba(255,255,255,0.78)', fontSize: 16, lineHeight: 24 },
  skip: { position: 'absolute', right: 20, minHeight: 44, justifyContent: 'center' },
  skipText: { color: 'rgba(255,255,255,0.85)' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 20 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotOn: { width: 20, backgroundColor: '#5BD0E3' },
  footer: { paddingHorizontal: 20 },
});
