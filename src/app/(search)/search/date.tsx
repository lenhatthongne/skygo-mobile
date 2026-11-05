import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useSearch } from '@/providers/search-provider';
import {
  addDays,
  daysInMonth,
  formatLongDate,
  parseIsoDate,
  todayVn,
  toIsoDate,
  weekdayIndex,
} from '@/utils/datetime';

const MAX_DAYS_AHEAD = 180; // the backend accepts flights from today up to 180 days ahead
const WEEK = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

function monthsBetween(start: string, end: string) {
  const a = parseIsoDate(start);
  const b = parseIsoDate(end);
  const months: { y: number; m: number }[] = [];
  let y = a.y;
  let m = a.m;
  while (y < b.y || (y === b.y && m <= b.m)) {
    months.push({ y, m });
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

export default function DatePickerScreen() {
  const theme = useTheme();
  const { criteria, setCriteria, setDate } = useSearch();
  // `field=return` edits the return date of the form; otherwise the leg being searched.
  const { field } = useLocalSearchParams<{ field?: string }>();
  const editingReturn = field === 'return';
  const [selected, setSelected] = useState(editingReturn ? criteria.returnDate : criteria.date);
  // A return flight cannot be before the outbound date.
  const today = editingReturn ? criteria.date : todayVn();
  const last = addDays(todayVn(), MAX_DAYS_AHEAD);

  return (
    <Screen
      header={{ title: editingReturn ? 'Chọn ngày về' : 'Chọn ngày bay', onBack: () => router.back(), close: true }}
      footer={
        <View style={styles.footer}>
          <View style={styles.flex}>
            <AppText variant="caption" tone="textMuted">
              {editingReturn ? 'Ngày về' : 'Ngày bay'}
            </AppText>
            <AppText variant="bodyBold">{formatLongDate(selected)}</AppText>
          </View>
          <Button
            label="Chọn"
            style={styles.confirm}
            onPress={() => {
              if (editingReturn) setCriteria((c) => ({ ...c, returnDate: selected }));
              else setDate(selected);
              router.back();
            }}
          />
        </View>
      }>
      {monthsBetween(today, last).map(({ y, m }) => {
        const offset = (weekdayIndex(toIsoDate(y, m, 1)) + 6) % 7; // Monday first
        const days = daysInMonth(y, m);
        return (
          <View key={`${y}-${m}`} style={styles.month}>
            <AppText variant="bodyBold">
              Tháng {m}, {y}
            </AppText>
            <View style={styles.grid}>
              {WEEK.map((w, i) => (
                <View key={w} style={styles.cell}>
                  <AppText variant="caption" tone={i === 6 ? 'danger' : 'textMuted'} style={styles.weekday}>
                    {w}
                  </AppText>
                </View>
              ))}
              {Array.from({ length: offset }, (_, i) => (
                <View key={`b${i}`} style={styles.cell} />
              ))}
              {Array.from({ length: days }, (_, i) => {
                const iso = toIsoDate(y, m, i + 1);
                const disabled = iso < today || iso > last;
                const active = iso === selected;
                return (
                  <View key={iso} style={styles.cell}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={formatLongDate(iso)}
                      accessibilityState={{ disabled, selected: active }}
                      disabled={disabled}
                      onPress={() => setSelected(iso)}
                      style={[
                        styles.day,
                        active && { backgroundColor: theme.primary },
                        !active && iso === today && { borderWidth: 1.5, borderColor: theme.primary },
                      ]}>
                      <AppText
                        variant="small"
                        style={{
                          color: active ? theme.onPrimary : disabled ? theme.border : theme.text,
                          fontWeight: active ? '800' : '500',
                        }}>
                        {i + 1}
                      </AppText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  confirm: { width: 140 },
  month: { marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8 },
  cell: { width: `${100 / 7}%`, height: 44, alignItems: 'center', justifyContent: 'center' },
  weekday: { fontWeight: '600' },
  day: { width: 40, height: 40, borderRadius: Radius.sm + 2, alignItems: 'center', justifyContent: 'center' },
});
