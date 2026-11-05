import { Feather } from '@expo/vector-icons';
import { Modal, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSession } from '@/providers/session-provider';

/** Shown over whatever screen is open when the server rejects the session. */
export function SessionExpiredDialog() {
  const theme = useTheme();
  const { status, expiredPrompt, reauthenticate, dismissExpiredPrompt } = useSession();

  return (
    <Modal
      transparent
      animationType="fade"
      visible={status === 'expired' && expiredPrompt}
      onRequestClose={dismissExpiredPrompt}>
      <View style={styles.backdrop}>
        <View style={[styles.box, { backgroundColor: theme.background }]}>
          <View style={[styles.ring, { backgroundColor: theme.primarySoft }]}>
            <Feather name="lock" size={32} color={theme.primary} />
          </View>
          <AppText variant="h2" style={styles.center}>
            Phiên đăng nhập đã hết hạn
          </AppText>
          <AppText tone="textSecondary" style={styles.center}>
            Vì lý do bảo mật, vui lòng đăng nhập lại để tiếp tục.
          </AppText>
          <View style={styles.actions}>
            <Button label="Đăng nhập lại" onPress={() => void reauthenticate()} />
            <Button label="Để sau" variant="ghost" onPress={dismissExpiredPrompt} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: 'rgba(15, 23, 42, 0.55)' },
  box: {
    borderRadius: Radius.xl,
    padding: 24,
    gap: 10,
    alignItems: 'center',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  ring: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  center: { textAlign: 'center' },
  actions: { alignSelf: 'stretch', gap: 4, marginTop: 14 },
});
