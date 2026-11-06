import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AppState,
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
const CARD_HEIGHT = 132;

const AUTOPLAY_MS = 4500;
/** After the customer swipes, the banners stay still for this long before moving on again. */
const RESUME_MS = 8000;

/**
 * Campaign banners that move on by themselves and can be swiped. A banner without its own picture
 * shows the photo of its destination city (`photos`, by airport code), so each one looks different.
 * Tapping one opens a flight search to its destination, if it has one.
 */
export function PromoBanners({
  items,
  photos = {},
}: {
  items: Api.Promotion[];
  photos?: Record<string, string>;
}) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const [page, setPage] = useState(0);
  const cardWidth = width - GUTTER * 2;
  const step = cardWidth + GAP;
  const listRef = useRef<FlatList<Api.Promotion>>(null);
  const pageRef = useRef(0);
  const idleUntil = useRef(0);
  const focused = useIsFocused();
  const count = items.length;

  // Moves to the next banner (and back to the first after the last) while the screen is showing and
  // the customer is not touching them. Paused in the background and when Home is not on screen.
  useEffect(() => {
    if (count < 2 || !focused) return;
    const timer = setInterval(() => {
      if (AppState.currentState !== 'active' || Date.now() < idleUntil.current) return;
      const next = (pageRef.current + 1) % count;
      pageRef.current = next;
      setPage(next);
      listRef.current?.scrollToOffset({ offset: next * step, animated: true });
    }, AUTOPLAY_MS);
    return () => clearInterval(timer);
  }, [count, focused, step]);

  if (items.length === 0) return null;

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / step);
    pageRef.current = next;
    setPage(next);
  };

  return (
    <View style={styles.wrap}>
      <FlatList
        ref={listRef}
        horizontal
        data={items}
        keyExtractor={(p) => String(p.id)}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth + GAP}
        decelerationRate="fast"
        onScrollBeginDrag={() => (idleUntil.current = Date.now() + RESUME_MS)}
        onMomentumScrollEnd={onScrollEnd}
        contentContainerStyle={{ paddingHorizontal: GUTTER, gap: GAP }}
        style={styles.list}
        renderItem={({ item }) => {
          const tone = PROMO_TONES[item.theme];
          const photo =
            item.imageUrl ?? (item.destinationCode ? photos[item.destinationCode] : null);
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.title}
              disabled={!item.destinationCode}
              onPress={() =>
                router.push({ pathname: '/search', params: { to: item.destinationCode ?? '' } })
              }
              style={[styles.card, { width: cardWidth, backgroundColor: theme[tone.bg] }]}>
              {photo ? (
                <>
                  <Image
                    source={{ uri: photo }}
                    contentFit="cover"
                    transition={300}
                    style={styles.photo}
                  />
                  <View style={styles.shade} />
                </>
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
                <AppText
                  variant="h2"
                  style={[styles.title, { color: photo ? '#ffffff' : theme[tone.fg] }]}
                  numberOfLines={2}>
                  {item.title}
                </AppText>
                <AppText
                  variant="caption"
                  style={[
                    styles.subtitle,
                    { color: photo ? 'rgba(255,255,255,0.9)' : theme[tone.fg] },
                  ]}
                  numberOfLines={1}>
                  {item.subtitle ?? ' '}
                </AppText>
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
  // One frame for every banner: the same height, and the chip, the title and the subtitle always
  // sit at the same place whatever the text, so nothing moves from one banner to the next.
  card: {
    height: CARD_HEIGHT,
    borderRadius: Radius.xl,
    padding: 16,
    overflow: 'hidden',
  },
  // A photo fills the card; a dark layer over it keeps the white text readable on any picture.
  photo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 20, 30, 0.42)',
  },
  glyph: { position: 'absolute', right: 14, bottom: 8, opacity: 0.35 },
  text: { flex: 1, maxWidth: '78%', gap: 6 },
  title: { flex: 1, fontSize: 18, lineHeight: 24 },
  subtitle: { height: 18 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4, marginTop: 8 },
  dot: { width: 5, height: 5, borderRadius: 3 },
});
