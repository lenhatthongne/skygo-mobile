import { NativeTabs } from 'expo-router/native-tabs';
import { useTranslation } from 'react-i18next';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';
import { useUnreadCount } from '@/services/notification-inbox';

/**
 * Bottom tabs. Android: every tab keeps its label (Material's default hides the labels of
 * unselected tabs), Material Symbols icons so the four look alike (`md` wins over `src` there), and
 * the app's teal for the selected tab. iOS keeps its SF Symbols / template images.
 */
export default function AppTabs() {
  const { t } = useTranslation();
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const unread = useUnreadCount();

  return (
    <NativeTabs
      backgroundColor={colors.background}
      labelVisibilityMode="labeled"
      indicatorColor={colors.primarySoft}
      rippleColor={colors.primarySoft}
      iconColor={{ default: colors.textMuted, selected: colors.primaryDark }}
      labelStyle={{
        default: { color: colors.textMuted, fontSize: 12 },
        selected: {
          color: colors.primaryDark,
          fontSize: 12,
          fontWeight: '700',
        },
      }}>
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>{t('tabs.home')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          md="home"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="trips">
        <NativeTabs.Trigger.Label>{t('tabs.trips')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'ticket', selected: 'ticket.fill' }}
          md="confirmation_number"
        />
        {unread > 0 ? (
          <NativeTabs.Trigger.Badge>{unread > 9 ? '9+' : String(unread)}</NativeTabs.Trigger.Badge>
        ) : null}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>{t('tabs.explore')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          md="explore"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="account">
        <NativeTabs.Trigger.Label>{t('tabs.account')}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} md="person" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
