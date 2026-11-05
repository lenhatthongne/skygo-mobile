import type { ThemeColor } from '@/constants/theme';

/** Theme tokens for each campaign colour, so banners follow light and dark mode. */
export const PROMO_TONES: Record<Api.PromotionTheme, { bg: ThemeColor; fg: ThemeColor }> = {
  TEAL: { bg: 'primarySoft', fg: 'primaryDark' },
  ORANGE: { bg: 'warningSoft', fg: 'warning' },
  PURPLE: { bg: 'purpleSoft', fg: 'purple' },
};
