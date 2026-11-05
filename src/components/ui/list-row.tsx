import { Feather } from '@expo/vector-icons';
import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

type Icon = React.ComponentProps<typeof Feather>['name'];

type ListRowProps = {
  icon?: Icon;
  /** A custom mark instead of a Feather icon (shown without the tinted square). */
  iconNode?: React.ReactNode;
  title: string;
  text?: string;
  /** Short value at the end, e.g. a count. */
  meta?: string;
  danger?: boolean;
  /** A control at the end of the row (switch, ...) instead of the chevron. */
  right?: React.ReactNode;
  onPress?: () => void;
};

/**
 * The one row used by Account and Settings: icon, title, optional description, and a control or
 * chevron at the end. Keeps every list in the app looking the same.
 */
export function ListRow({
  icon,
  iconNode,
  title,
  text,
  meta,
  danger = false,
  right,
  onPress,
}: ListRowProps) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.row, { opacity: pressed ? 0.7 : 1 }]}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: iconNode
              ? 'transparent'
              : danger
                ? theme.dangerSoft
                : theme.primarySoft,
          },
        ]}>
        {iconNode ??
          (icon ? (
            <Feather name={icon} size={20} color={danger ? theme.danger : theme.primary} />
          ) : null)}
      </View>
      <View style={styles.flex}>
        <AppText variant="bodyBold" tone={danger ? 'danger' : 'text'}>
          {title}
        </AppText>
        {text ? (
          <AppText variant="small" tone="textMuted">
            {text}
          </AppText>
        ) : null}
      </View>
      {meta ? <AppText tone="textMuted">{meta}</AppText> : null}
      {right ??
        (onPress && !danger ? (
          <Feather name="chevron-right" size={20} color={theme.textMuted} />
        ) : null)}
    </Pressable>
  );
}

/** A white rounded card that draws a hairline between its rows. */
export function ListCard({ children }: { children: React.ReactNode }) {
  const theme = useTheme();
  const rows = Children.toArray(children);
  return (
    <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.border }]}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={[styles.rule, { backgroundColor: theme.border }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** Small grey heading above a card ("DỊCH VỤ CỦA TÔI"). */
export function ListSection({ title }: { title: string }) {
  return (
    <AppText variant="label" tone="textMuted" style={styles.section}>
      {title}
    </AppText>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: { borderWidth: 1, borderRadius: Radius.xl, paddingHorizontal: 12, paddingVertical: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, minHeight: 68 },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rule: { height: 1 },
  section: { marginTop: 14, marginLeft: 6, marginBottom: 6, letterSpacing: 0.6 },
});
