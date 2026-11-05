import { Component, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './app-text';

type Props = {
  children: ReactNode;
  /** Short text shown in place of a row that failed to render. */
  fallback: string;
};

type State = { error: Error | null };

/**
 * Keeps one broken list row from taking the whole screen down. The row is replaced by a small
 * notice; in development the real error message is shown (and logged) so it can be fixed.
 */
export class RowErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: unknown): State {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: Error) {
    if (__DEV__) console.warn('A list row failed to render:', error.name, error.message);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <View style={styles.box} accessibilityRole="alert">
        <AppText variant="smallBold" tone="danger">
          {this.props.fallback}
        </AppText>
        {__DEV__ ? (
          <AppText variant="caption" tone="textSecondary" selectable>
            {error.name}: {error.message || '(không có thông báo)'}
          </AppText>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  box: { padding: 14, gap: 4, borderRadius: 14, borderWidth: 1, borderColor: '#E1B4B4' },
});
