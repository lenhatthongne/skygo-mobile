import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'skygo.recent-searches';
const MAX = 5;

export type RecentSearch = {
  from: { code: string; city: string };
  to: { code: string; city: string };
  adults: number;
  children: number;
  infants: number;
};

export async function loadRecentSearches(): Promise<RecentSearch[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as RecentSearch[]) : [];
  } catch {
    return [];
  }
}

export async function saveRecentSearch(item: RecentSearch) {
  const same = (a: RecentSearch) =>
    a.from.code === item.from.code &&
    a.to.code === item.to.code &&
    a.adults === item.adults &&
    a.children === item.children &&
    a.infants === item.infants;
  const next = [item, ...(await loadRecentSearches()).filter((x) => !same(x))].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Recent searches are a convenience only.
  }
  return next;
}

export async function clearRecentSearches() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
