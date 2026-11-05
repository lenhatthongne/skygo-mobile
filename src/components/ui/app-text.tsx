import { StyleSheet, Text, type TextProps } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = 'h1' | 'h2' | 'body' | 'bodyBold' | 'small' | 'smallBold' | 'caption' | 'label';

export type AppTextProps = TextProps & { variant?: Variant; tone?: ThemeColor };

export function AppText({ variant = 'body', tone = 'text', style, ...rest }: AppTextProps) {
  const theme = useTheme();
  return <Text style={[{ color: theme[tone] }, styles[variant], style]} {...rest} />;
}

const styles = StyleSheet.create({
  h1: { fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: -0.4 },
  h2: { fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyBold: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  small: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  smallBold: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  caption: { fontSize: 12.5, lineHeight: 18, fontWeight: '500' },
  label: { fontSize: 13.5, lineHeight: 18, fontWeight: '600' },
});
