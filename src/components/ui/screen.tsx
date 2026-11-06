import { Feather } from '@expo/vector-icons';
import { type ComponentRef, useRef, useState } from 'react';
import { Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import {
  KeyboardAwareScrollView,
  KeyboardStickyView,
  useKeyboardState,
} from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth } from '@/constants/theme';
import { useScrollToTopOnTabReset } from '@/hooks/use-tab-reset';
import { useTheme } from '@/hooks/use-theme';

import { BookingStepper } from '@/components/booking/booking-stepper';

import { AppText } from './app-text';

type ScreenProps = {
  children: React.ReactNode;
  /** Pinned below the content, above the keyboard (primary action area). */
  footer?: React.ReactNode;
  /** Back button and optional centered title. */
  /** `steps` (1 to 4) shows the booking stepper beside the back button, with the title below. */
  header?: { title?: string; onBack?: () => void; close?: boolean; steps?: number };
  /** Changing it scrolls back to the top (a new step of a flow). */
  scrollKey?: string | number;
  /** No page colour of its own, so a background drawn behind it shows through. */
  transparent?: boolean;
  /** Pull to refresh. `refreshing` should only be on for a pull, never for a silent reload. */
  refresh?: { refreshing: boolean; onRefresh: () => void };
};

export function Screen({
  children,
  footer,
  header,
  scrollKey,
  transparent = false,
  refresh,
}: ScreenProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [footerHeight, setFooterHeight] = useState(0);
  const scroll = useRef<ComponentRef<typeof KeyboardAwareScrollView>>(null);
  useScrollToTopOnTabReset(scroll);
  const keyboardVisible = useKeyboardState((state) => state.isVisible);
  const footerPadding = Math.max(insets.bottom, 16);

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: transparent ? 'transparent' : theme.background, paddingTop: insets.top },
      ]}>
      {header?.steps ? (
        <>
          <View style={styles.header}>
            {header.onBack ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Quay lại"
                hitSlop={8}
                onPress={header.onBack}
                style={styles.back}>
                <Feather name="arrow-left" size={22} color={theme.text} />
              </Pressable>
            ) : (
              <View style={styles.back} />
            )}
            <View style={styles.stepper}>
              <BookingStepper current={header.steps} />
            </View>
          </View>
          <View style={[styles.stepTitle, { borderBottomColor: theme.border }]}>
            <AppText variant="bodyBold" style={styles.title} numberOfLines={1}>
              {header.title}
            </AppText>
          </View>
        </>
      ) : header ? (
        <View style={styles.header}>
          {header.onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={header.close ? 'Đóng' : 'Quay lại'}
              hitSlop={8}
              onPress={header.onBack}
              style={styles.back}>
              <Feather name={header.close ? 'x' : 'arrow-left'} size={22} color={theme.text} />
            </Pressable>
          ) : (
            <View style={styles.back} />
          )}
          <AppText variant="bodyBold" style={styles.title} numberOfLines={1}>
            {header.title}
          </AppText>
          <View style={styles.back} />
        </View>
      ) : null}
      {/* Both platforms: the focused field scrolls above the keyboard (and above the footer), and
          the footer rides on top of the keyboard. Android draws edge to edge, so the window is not
          resized for the keyboard and a plain KeyboardAvoidingView would leave fields covered. */}
      <View style={styles.flex}>
        <KeyboardAwareScrollView
          ref={scroll}
          key={scrollKey}
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bottomOffset={footerHeight + 16}
          refreshControl={
            refresh ? (
              <RefreshControl
                refreshing={refresh.refreshing}
                onRefresh={refresh.onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            ) : undefined
          }>
          <View style={styles.inner}>{children}</View>
        </KeyboardAwareScrollView>
        {footer ? (
          // The safe-area padding is not needed above the keyboard, so it slides under it.
          <KeyboardStickyView offset={{ closed: 0, opened: footerPadding - 12 }}>
            <View
              onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
              style={[
                styles.footer,
                {
                  paddingBottom: footerPadding,
                  // Above the keyboard the footer overlaps the scrolled content, which must not
                  // show through; otherwise a transparent screen keeps its photo behind it.
                  backgroundColor:
                    transparent && !keyboardVisible ? 'transparent' : theme.background,
                },
              ]}>
              <View style={styles.inner}>{footer}</View>
            </View>
          </KeyboardStickyView>
        ) : (
          <View style={{ height: insets.bottom }} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: { height: 52, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  stepper: { flex: 1, paddingLeft: 8, paddingRight: 16 },
  stepTitle: { paddingVertical: 10, borderBottomWidth: 1 },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17 },
  content: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  inner: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center' },
  footer: { paddingHorizontal: 20, paddingTop: 12, gap: 12 },
});
