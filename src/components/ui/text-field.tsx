import { Feather } from '@expo/vector-icons';
import { type ComponentRef, type Ref, useState } from 'react';
import { StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';

export type TextInputHandle = ComponentRef<typeof TextInput>;

type TextFieldProps = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
  leftIcon?: React.ComponentProps<typeof Feather>['name'];
  /** Fixed text before the input, e.g. a country code. */
  prefix?: string;
  right?: React.ReactNode;
  ref?: Ref<TextInputHandle>;
};

export function TextField({
  label,
  error,
  hint,
  leftIcon,
  prefix,
  right,
  ref,
  style,
  onFocus,
  onBlur,
  ...inputProps
}: TextFieldProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const borderColor = error ? theme.danger : focused ? theme.primary : theme.border;
  const ringColor = error ? theme.dangerSoft : focused ? theme.primarySoft : 'transparent';

  return (
    <View style={styles.wrapper}>
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <View style={[styles.ring, { borderColor: ringColor }]}>
        <View style={[styles.box, { borderColor, backgroundColor: theme.background }]}>
          {leftIcon ? <Feather name={leftIcon} size={19} color={theme.textMuted} /> : null}
          {prefix ? (
            <AppText variant="bodyBold" style={[styles.prefix, { borderColor: theme.border }]}>
              {prefix}
            </AppText>
          ) : null}
          <TextInput
            ref={ref}
            accessibilityLabel={label}
            placeholderTextColor={theme.textMuted}
            selectionColor={theme.primary}
            style={[styles.input, { color: theme.text }, style]}
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            {...inputProps}
          />
          {right}
        </View>
      </View>
      {error ? (
        <View style={styles.help} accessibilityRole="alert">
          <Feather name="alert-circle" size={14} color={theme.danger} />
          <AppText variant="caption" tone="danger">
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="textMuted" style={styles.hintText}>
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginTop: 14 },
  label: { marginBottom: 6 },
  ring: { borderWidth: 4, borderRadius: Radius.md + 3, marginHorizontal: -4 },
  box: {
    minHeight: 52,
    borderWidth: 1.5,
    borderRadius: Radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  prefix: { paddingRight: 10, borderRightWidth: 1 },
  input: { flex: 1, fontSize: 16, fontWeight: '500', paddingVertical: 12, outlineWidth: 0 },
  help: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  hintText: { marginTop: 6 },
});
