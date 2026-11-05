import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { useTheme } from '@/hooks/use-theme';

/**
 * Full-screen photo for the sign-in screens. A top-to-bottom gradient fades it into the page
 * colour, so the form always sits on a plain surface (white in light mode, black in dark mode)
 * and the text stays readable. A light scrim at the top keeps white text over the photo legible.
 * Draw it first, behind a `Screen transparent`.
 */
type Props = {
  /** `light` fades into the page colour; `dark` fades into deep navy (hero screens). */
  tone?: 'light' | 'dark';
};

export const HERO_NAVY = '#0B1B26';

export function AuthBackground({ tone = 'light' }: Props) {
  const theme = useTheme();
  const base = tone === 'dark' ? HERO_NAVY : theme.background;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        source={require('@/assets/images/auth-bg.jpg')}
        accessible={false}
        contentFit="cover"
        contentPosition="top"
        style={StyleSheet.absoluteFill}
      />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <LinearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#062834" stopOpacity={0.35} />
            <Stop offset="0.22" stopColor="#062834" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.2" stopColor={base} stopOpacity={0} />
            <Stop offset="0.42" stopColor={base} stopOpacity={0.88} />
            <Stop offset="0.54" stopColor={base} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#scrim)" />
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#fade)" />
      </Svg>
    </View>
  );
}
