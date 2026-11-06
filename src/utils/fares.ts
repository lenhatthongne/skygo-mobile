import i18n from '@/i18n';

import { formatVnd } from './money';
import { type Party, seatCount } from './passengers';

/** Read when used, so the names follow the language chosen in Settings. */
export const FARE_NAMES: Record<Api.FareClassCode, string> = {
  get ECO_SAVER() {
    return i18n.t('fares.name.ECO_SAVER');
  },
  get ECO_FLEX() {
    return i18n.t('fares.name.ECO_FLEX');
  },
  get BUSINESS() {
    return i18n.t('fares.name.BUSINESS');
  },
};

/** The fare without the cabin word ("Tiết kiệm", "Saver"). */
export const fareShortName = (code: Api.FareClassCode) => i18n.t(`fares.short.${code}`);

export const fareName = (fare: Api.FareClass) => FARE_NAMES[fare.classCode] ?? fare.classCode;

export const hasSeatsFor = (fare: Api.FareClass, party: Party) =>
  fare.seatsAvailable >= seatCount(party);

/** Price of one adult including tax. */
export const adultPrice = (fare: Api.FareClass) => fare.baseFare + fare.taxFee;

export type Benefit = { ok: boolean; text: string };

/** Baggage and cancellation conditions, straight from the fare data. */
export function fareBenefits(fare: Api.FareClass): Benefit[] {
  const items: Benefit[] = [{ ok: true, text: i18n.t('fares.cabin', { kg: fare.cabinBaggageKg }) }];
  items.push(
    fare.checkedBaggageKg > 0
      ? { ok: true, text: i18n.t('fares.checked', { kg: fare.checkedBaggageKg }) }
      : { ok: false, text: i18n.t('fares.noChecked') },
  );
  items.push(
    fare.refundable
      ? {
          ok: true,
          text:
            fare.cancelFee > 0
              ? i18n.t('fares.cancelFee', { fee: formatVnd(fare.cancelFee) })
              : i18n.t('fares.cancelFree'),
        }
      : { ok: false, text: i18n.t('fares.noCancel') },
  );
  if (fare.classCode === 'BUSINESS') items.push({ ok: true, text: i18n.t('fares.seatChange') });
  return items;
}
