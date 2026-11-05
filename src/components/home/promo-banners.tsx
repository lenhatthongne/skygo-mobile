import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  FlatList,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { PROMO_TONES } from './promo-theme';

const GUTTER = 20;
const GAP = 12;

/** Swipeable campaign banners. Tapping one opens a flight search to its destination, if it has one. */
export function PromoBanners({ items }: { items: Api.Promotion[] }) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const cardWidth = width - GUTTER * 2;

  if (items.length === 0) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) =>
    setPage(Math.round(e.nativeEvent.contentOffset.x / (cardWidth + GAP)));

  return (
    <View style={styles.wrap}>
      <FlatList
        horizontal
        data={items}
        keyExtractor={(p) => String(p.id)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP }}
        style={styles.list}
        renderItem={({ item }) => {
          const tone = PROMO_TONES[item.theme];
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              disabled={!item.destinationCode}
              onPress={() =>
                router.push({ pathname: '/search', params: { to: item.destinationCode ?? '' } })
              }
              style={[styles.card, { width: cardWidth, backgroundColor: theme[tone.bg] }]}>
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} contentFit="cover" style={styles.photo} />
              ) : (
                <MaterialCommunityIcons
                  name="airplane"
                  size={64}
                  color={theme[tone.fg]}
                  style={styles.glyph}
                />
              )}
              <View style={styles.text}>
                <View style={[styles.chip, { backgroundColor: theme[tone.fg] }]}>
                  <AppText variant="caption" style={{ color: theme.background, fontWeight: '700' }}>
                    {t('home.campaign')}
                  </AppText>
                </View>
                <AppText variant="h2" style={{ color: theme[tone.fg] }} numberOfLines={2}>
                  {item.title}
                </AppText>
                {item.subtitle ? (
                  <AppText variant="caption" style={{ color: theme[tone.fg] }} numberOfLines={1}>
                    {item.subtitle}
                  </AppText>
                ) : null}
              </View>
            </Pressable>
          );
        }}
      />
      {items.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden>
          {items.map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.dot,
                i === page
                  ? { width: 16, backgroundColor: theme.primary }
                  : { backgroundColor: theme.border },
              ]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 20 },
  list: { marginHorizontal: -GUTTER },
  card: {
    minHeight: 104,
    borderRadius: Radius.xl,
    padding: 16,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, opacity: 0.35 },
  glyph: { position: 'absolute', right: 14, bottom: 8, opacity: 0.35 },
  text: { gap: 4, maxWidth: '78%' },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
