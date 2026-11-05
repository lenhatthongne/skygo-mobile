import { formatVnd } from './money';
import { type Party, seatCount } from './passengers';

export const FARE_NAMES: Record<Api.FareClassCode, string> = {
  ECO_SAVER: 'Phổ thông Tiết kiệm',
  ECO_FLEX: 'Phổ thông Linh hoạt',
  BUSINESS: 'Thương gia',
};

export const fareName = (fare: Api.FareClass) => FARE_NAMES[fare.classCode] ?? fare.classCode;

export const hasSeatsFor = (fare: Api.FareClass, party: Party) =>
  fare.seatsAvailable >= seatCount(party);

/** Price of one adult including tax. */
export const adultPrice = (fare: Api.FareClass) => fare.baseFare + fare.taxFee;

export type Benefit = { ok: boolean; text: string };

/** Baggage and cancellation conditions, straight from the fare data. */
export function fareBenefits(fare: Api.FareClass): Benefit[] {
  const items: Benefit[] = [{ ok: true, text: `Hành lý xách tay ${fare.cabinBaggageKg} kg` }];
  items.push(
    fare.checkedBaggageKg > 0
      ? { ok: true, text: `Hành lý ký gửi ${fare.checkedBaggageKg} kg` }
      : { ok: false, text: 'Không gồm hành lý ký gửi' },
  );
  items.push(
    fare.refundable
      ? {
          ok: true,
          text:
            fare.cancelFee > 0
              ? `Hủy trước giờ bay 24 giờ, phí ${formatVnd(fare.cancelFee)}/khách`
              : 'Hủy miễn phí trước giờ bay 24 giờ',
        }
      : { ok: false, text: 'Không được hủy, hoàn tiền' },
  );
  return items;
}
