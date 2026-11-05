import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { AppText } from './app-text';
import { Button } from './button';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm button for destructive actions. */
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/** A confirmation step for dangerous actions. Alert.alert does nothing on web, so this is a Modal. */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const theme = useTheme();
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <Pressable accessibilityLabel="Đóng" style={StyleSheet.absoluteFill} onPress={loading ? undefined : onCancel} />
        <View style={[styles.box, { backgroundColor: theme.background }]}>
          <AppText variant="h2">{title}</AppText>
          <AppText tone="textSecondary">{message}</AppText>
          <View style={styles.actions}>
            <Button
              label={confirmLabel}
              variant={destructive ? 'danger' : 'primary'}
              loading={loading}
              onPress={onConfirm}
            />
            <Button label="Không, giữ lại" variant="ghost" disabled={loading} onPress={onCancel} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
  },
  box: { borderRadius: Radius.xl, padding: 20, gap: 10, width: '100%', maxWidth: 440, alignSelf: 'center' },
  actions: { gap: 4, marginTop: 10 },
});
