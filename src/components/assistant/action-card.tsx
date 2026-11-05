import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDayMonth } from '@/utils/datetime';

type Icon = React.ComponentProps<typeof Feather>['name'];

/** Label, hint and icon of a button the assistant proposes. */
export function describeAction(action: Api.AssistantAction): { icon: Icon; title: string; hint?: string } {
  switch (action.type) {
    case 'OPEN_SEARCH': {
      const party = (action.adults ?? 1) + (action.children ?? 0) + (action.infants ?? 0);
      const dates = action.date
        ? `${formatDayMonth(action.date)}${action.returnDate ? ` – ${formatDayMonth(action.returnDate)}` : ''}`
        : '';
      return {
        icon: 'search',
        title: `Tìm chuyến ${action.from} ${action.returnDate ? '⇄' : '→'} ${action.to}`,
        hint: `${dates} · ${party} khách`,
      };
    }
    case 'OPEN_BOOKING':
      return { icon: 'file-text', title: 'Xem chi tiết đặt chỗ' };
    case 'OPEN_TICKET':
      return { icon: 'tag', title: 'Mở vé điện tử' };
    case 'OPEN_SUPPORT_NEW':
      return { icon: 'message-square', title: 'Gửi yêu cầu hỗ trợ', hint: action.subject ?? undefined };
    case 'OPEN_FAQ':
      return { icon: 'help-circle', title: 'Câu hỏi thường gặp' };
  }
}

/** A tappable card under an assistant message. Nothing happens until the customer taps it. */
export function ActionCard({ action, onPress }: { action: Api.AssistantAction; onPress: () => void }) {
  const theme = useTheme();
  const { icon, title, hint } = describeAction(action);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.background, borderColor: theme.primary, opacity: pressed ? 0.85 : 1 },
      ]}>
      <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
        <Feather name={icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.flex}>
        <AppText variant="smallBold">{title}</AppText>
        {hint ? (
          <AppText variant="caption" tone="textMuted" numberOfLines={1}>
            {hint}
          </AppText>
        ) : null}
      </View>
      <Feather name="chevron-right" size={18} color={theme.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: Radius.lg,
    padding: 10,
    minHeight: 52,
  },
  icon: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
});
