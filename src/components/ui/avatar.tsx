import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { avatarUri } from '@/utils/avatar';

import { AppText } from './app-text';

type Props = {
  user: Pick<Api.User, 'fullName' | 'avatarUrl'> | null;
  size?: number;
};

/** The customer's profile photo, or the first letter of the name on the brand colour. */
export function Avatar({ user, size = 44 }: Props) {
  const theme = useTheme();
  const uri = avatarUri(user?.avatarUrl);
  // The file can be gone or unreachable: fall back to the letter rather than a blank circle.
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const showPhoto = !!uri && failedUri !== uri;
  const initial = (user?.fullName ?? '').trim().charAt(0).toUpperCase();

  return (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primary },
      ]}>
      {showPhoto ? (
        <Image
          source={{ uri }}
          accessibilityLabel="Ảnh đại diện"
          contentFit="cover"
          transition={150}
          onError={() => setFailedUri(uri)}
          style={{ width: size, height: size }}
        />
      ) : (
        <AppText
          style={{
            color: theme.onPrimary,
            fontSize: size * 0.42,
            lineHeight: size * 0.52,
            fontWeight: '800',
          }}>
          {initial}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
