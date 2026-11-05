import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type Tone = 'info' | 'warning' | 'error' | 'success' | 'primary';

const ICONS: Record<Tone, React.ComponentProps<typeof Feather>['name']> = {
  info: 'info',
  warning: 'alert-triangle',
  error: 'alert-circle',
  success: 'check-circle',
  primary: 'mail',
};

export function Banner({
  tone = 'info',
  icon,
  children,
}: {
  tone?: Tone;
  icon?: React.ComponentProps<typeof Feather>['name'];
  children: React.ReactNode;
}) {
  const theme = useTheme();
  const colors = {
    info: { bg: theme.infoSoft, fg: theme.info },
    warning: { bg: theme.warningSoft, fg: theme.warning },
    error: { bg: theme.dangerSoft, fg: theme.danger },
    success: { bg: theme.successSoft, fg: theme.success },
    primary: { bg: theme.primarySoft, fg: theme.primaryDark },
  }[tone];

  return (
    <View
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
      style={[styles.box, { backgroundColor: colors.bg }]}>
      <Feather name={icon ?? ICONS[tone]} size={18} color={colors.fg} style={styles.icon} />
      <AppText variant="small" style={[styles.text, { color: colors.fg }]}>
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: 'row', gap: 10, padding: 14, borderRadius: Radius.md },
  icon: { marginTop: 1 },
  text: { flex: 1, fontWeight: '500' },
});
