import type { Coords } from '@/utils/geo';

type AirportsMapProps = {
  airports: Api.Airport[];
  selectedCode: string | null;
  user: Coords | null;
  onSelect: (code: string) => void;
};

/** react-native-maps has no web build: the airport list works on its own there. */
export function AirportsMap(_props: AirportsMapProps) {
  return null;
}
