import { Image } from 'expo-image';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { API_BASE_URL } from '@/services/api/config';
import { getAccessToken } from '@/services/api/token-store';

/** `/api/support-images/x` from the server becomes a full address on this build's API host. */
function sourceOf(path: string) {
  const origin = API_BASE_URL.replace(/\/api\/?$/, '');
  return {
    uri: `${origin}${path}`,
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
  };
}

/** A photo from a conversation, a thumbnail that opens full screen when tapped. */
export function SupportImage({ path, mine }: { path: string; mine: boolean }) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const source = sourceOf(path);

  return (
    <>
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={t('supportChat.viewPhoto')}
        onPress={() => setOpen(true)}>
        <Image
          source={source}
          style={[styles.thumb, mine ? styles.mine : styles.theirs]}
          contentFit="cover"
          transition={150}
        />
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('supportChat.close')}
            onPress={() => setOpen(false)}
            hitSlop={12}
            style={[styles.close, { top: insets.top + 12 }]}>
            <Feather name="x" size={24} color="#fff" />
          </Pressable>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 220, height: 160, borderRadius: 14, backgroundColor: 'rgba(128,128,128,0.2)' },
  mine: { borderBottomRightRadius: 4 },
  theirs: { borderBottomLeftRadius: 4 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.94)' },
  close: {
    position: 'absolute',
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
});
