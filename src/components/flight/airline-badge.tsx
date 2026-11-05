import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';

const COLORS = ['#0B6E99', '#7C3AED', '#B45309', '#15803D', '#BE185D', '#0F766E'];

function colorFor(code: string) {
  let hash = 0;
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) % COLORS.length;
  return COLORS[hash];
}

/** Airline logo, or a colored badge with the airline code when there is no logo. */
export function AirlineBadge({ airline, size = 40 }: { airline: Api.Airline; size?: number }) {
  if (airline.logoUrl) {
    return (
      <Image
        source={{ uri: airline.logoUrl }}
        accessibilityLabel={airline.name}
        style={{ width: size, height: size, borderRadius: size * 0.3 }}
        contentFit="contain"
      />
    );
  }
  return (
    <View
      accessibilityLabel={airline.name}
      style={[
        styles.badge,
        { width: size, height: size, borderRadius: size * 0.3, backgroundColor: colorFor(airline.code) },
      ]}>
      <AppText variant="smallBold" style={styles.code}>
        {airline.code}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: 'center', justifyContent: 'center' },
  code: { color: '#ffffff', fontSize: 13 },
});
