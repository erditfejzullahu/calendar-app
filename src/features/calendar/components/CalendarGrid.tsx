import {memo, useCallback} from 'react';
import {StyleSheet, View} from 'react-native';
import {spacing} from '@shared/theme/spacing';
import {useCalendarMatrix, DayCell} from '../hooks/useCalendarMatrix';
import {useMeetingCountsByDate} from '@store/meetings/meetings.selectors';
import {CalendarDayCell} from './CalendarDayCell';

type Props = {
  year: number;
  month: number;
  selectedDateISO: string | null;
  onSelectDate: (dateISO: string) => void;
};

const CalendarGridBase = ({year, month, selectedDateISO, onSelectDate}: Props) => {
  const rows = useCalendarMatrix(year, month);
  const counts = useMeetingCountsByDate();

  const handlePress = useCallback(
    (cell: DayCell) => onSelectDate(cell.dateISO),
    [onSelectDate],
  );

  return (
    <View style={styles.grid}>
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={styles.row}>
          {row.map(cell => (
            <CalendarDayCell
              key={cell.dateISO}
              cell={cell}
              meetingCount={counts[cell.dateISO] ?? 0}
              selected={cell.dateISO === selectedDateISO}
              onPress={handlePress}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

export const CalendarGrid = memo(CalendarGridBase);

const styles = StyleSheet.create({
  grid: {paddingHorizontal: spacing.lg},
  row: {flexDirection: 'row'},
});
