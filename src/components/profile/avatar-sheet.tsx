import { Feather } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  visible: boolean;
  hasPhoto: boolean;
  onLibrary: () => void;
  onCamera: () => void;
  onRemove: () => void;
  onClose: () => void;
};

/** Bottom sheet with the ways to change the profile photo. */
export function AvatarSheet({ visible, hasPhoto, onLibrary, onCamera, onRemove, onClose }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View style={styles.scrim}>
        <Pressable accessibilityLabel={t('common.close')} style={styles.flex} onPress={onClose} />
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          <View style={[styles.grab, { backgroundColor: theme.border }]} />
          <AppText variant="h2" style={styles.title}>
            {t('profile.sheetTitle')}
          </AppText>
          <Option icon="image" label={t('profile.sheetLibrary')} onPress={onLibrary} />
          <Option icon="camera" label={t('profile.sheetCamera')} onPress={onCamera} />
          {hasPhoto ? (
            <Option icon="trash-2" label={t('profile.sheetRemove')} danger onPress={onRemove} />
          ) : null}
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.cancel}>
            <AppText variant="bodyBold" tone="textSecondary">
              {t('profile.sheetCancel')}
            </AppText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Option({
  icon,
  label,
  danger = false,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.option, { opacity: pressed ? 0.6 : 1 }]}>
      <Feather name={icon} size={22} color={danger ? theme.danger : theme.primary} />
      <AppText variant="bodyBold" tone={danger ? 'danger' : 'text'}>
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scrim: { flex: 1, backgroundColor: 'rgba(14,17,22,0.5)' },
  sheet: {
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 28,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2 },
  title: { paddingTop: 12, paddingBottom: 4 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 56 },
  cancel: { alignItems: 'center', justifyContent: 'center', minHeight: 52, marginTop: 4 },
});
