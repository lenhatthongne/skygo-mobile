import type { MaterialCommunityIcons } from '@expo/vector-icons';

import i18n from '@/i18n';

import { formatVnd } from './money';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

/** Services the backend can list in `fareClass.amenities`; unknown codes are ignored. */
const AMENITIES: Record<string, { icon: IconName; label: string }> = {
  WIFI: { icon: 'wifi', label: 'Wi-Fi trên chuyến bay' },
  MEAL: { icon: 'food', label: 'Suất ăn nóng' },
  SNACK: { icon: 'cookie', label: 'Đồ ăn nhẹ và nước uống' },
  POWER: { icon: 'power-plug', label: 'Ổ cắm và cổng USB' },
  ENTERTAINMENT: { icon: 'movie-open', label: 'Giải trí trên chuyến bay' },
  PRIORITY_BOARDING: { icon: 'star-circle', label: 'Ưu tiên lên máy bay' },
  LOUNGE: { icon: 'sofa', label: 'Phòng chờ' },
};

export type Highlight = {
  key: string;
  icon: IconName;
  label: string;
  /** False for something this fare does not give (shown muted, so fares can be compared). */
  included: boolean;
};

/**
 * What a fare class gives, as icon rows: cabin and checked baggage and cancellation (from the
 * fare itself), then the in-flight services the backend lists. Nothing here is made up: a service
 * the backend does not list is simply absent.
 */
export function fareHighlights(fare: Api.FareClass): Highlight[] {
  const list: Highlight[] = [
    {
      key: 'cabin',
      icon: 'bag-carry-on',
      label: `Xách tay ${fare.cabinBaggageKg} kg`,
      included: fare.cabinBaggageKg > 0,
    },
    {
      key: 'checked',
      icon: 'bag-suitcase',
      label:
        fare.checkedBaggageKg > 0
          ? `Ký gửi ${fare.checkedBaggageKg} kg`
          : 'Không gồm hành lý ký gửi',
      included: fare.checkedBaggageKg > 0,
    },
    {
      key: 'refund',
      icon: 'cash-refund',
      label: fare.refundable
        ? fare.cancelFee > 0
          ? `Hủy trước 24 giờ, phí ${formatVnd(fare.cancelFee)}/khách`
          : 'Hủy miễn phí trước 24 giờ'
        : 'Không hủy, không hoàn tiền',
      included: fare.refundable,
    },
  ];
  list.push({
    key: 'seatChange',
    icon: 'seat-passenger',
    label: i18n.t(fare.classCode === 'BUSINESS' ? 'fares.seatChange' : 'fares.noSeatChange'),
    included: fare.classCode === 'BUSINESS',
  });
  for (const code of fare.amenities ?? []) {
    const known = AMENITIES[code];
    if (known) list.push({ key: code, icon: known.icon, label: known.label, included: true });
  }
  return list;
}
