import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';

const SLIDE_MS = 6000;

/**
 * A wide photo at the bottom of Home that moves through the popular destinations shown above it.
 * Tapping opens a flight search to the city on screen. Only airports that have a photo are used,
 * and the photo's credit is shown, as its licence asks.
 */
export function DestinationShowcase({ destinations }: { destinations: Api.Airport[] }) {
  const { t } = useTranslation();
  const photos = destinations.filter((a) => !!a.imageUrl);
  const [index, setIndex] = useState(0);
  const count = photos.length;

  useEffect(() => {
    if (count < 2) return;
    const timer = setInterval(() => {
      if (AppState.currentState === 'active') setIndex((i) => (i + 1) % count);
    }, SLIDE_MS);
    return () => clearInterval(timer);
  }, [count]);

  if (count === 0) return null;
  const airport = photos[index % count];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('home.searchTo', { city: airport.city })}
      onPress={() => router.push({ pathname: '/search', params: { to: airport.code } })}
      style={styles.card}>
      <Image
        source={{ uri: airport.imageUrl ?? undefined }}
        accessibilityLabel={t('home.photoOf', { city: airport.city })}
        contentFit="cover"
        transition={600}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.shade} />
      <View style={styles.text}>
        <AppText variant="caption" style={styles.kicker}>
          {t('home.showcase.kicker')}
        </AppText>
        <AppText variant="h2" style={styles.title}>
          {t('home.showcase.title', { city: airport.city })}
        </AppText>
        <View style={styles.cta}>
          <AppText variant="smallBold" style={styles.ctaText}>
            {t('home.viewFlights')}
          </AppText>
          <Feather name="arrow-right" size={16} color="#ffffff" />
        </View>
      </View>
      {airport.imageCredit ? (
        <AppText variant="caption" numberOfLines={1} style={styles.credit}>
          {t('home.showcase.credit', { credit: airport.imageCredit })}
        </AppText>
      ) : null}
      {count > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden>
          {photos.map((a, i) => (
            <View key={a.code} style={[styles.dot, i === index % count && styles.dotOn]} />
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 28,
    height: 190,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#14405A',
    justifyContent: 'flex-end',
  },
  shade: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(5, 20, 30, 0.38)',
  },
  text: { padding: 16, paddingBottom: 30, gap: 4 },
  kicker: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', letterSpacing: 0.4 },
  title: { color: '#ffffff' },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  ctaText: { color: '#ffffff' },
  credit: {
    position: 'absolute',
    left: 16,
    right: 90,
    bottom: 8,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 10.5,
  },
  dots: { position: 'absolute', right: 14, bottom: 12, flexDirection: 'row', gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotOn: { width: 16, backgroundColor: '#ffffff' },
});
