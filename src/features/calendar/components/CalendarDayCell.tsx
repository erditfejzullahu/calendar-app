import {memo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import type {DayCell} from '../hooks/useCalendarMatrix';

type Props = {
  cell: DayCell;
  meetingCount: number;
  selected: boolean;
  onPress: (cell: DayCell) => void;
};

const CalendarDayCellBase = ({cell, meetingCount, selected, onPress}: Props) => {
  const {day, inCurrentMonth, isToday} = cell;

  const labelColor = !inCurrentMonth
    ? colors.borderStrong
    : selected
      ? colors.textInverse
      : isToday
        ? colors.primary
        : colors.text;

  return (
    <Pressable
      onPress={() => onPress(cell)}
      style={({pressed}) => [styles.root, pressed && styles.pressed]}>
      <View
        style={[
          styles.bubble,
          selected && styles.bubbleSelected,
          !selected && isToday && styles.bubbleToday,
        ]}>
        <AppText variant="bodyStrong" color={labelColor}>
          {day}
        </AppText>
      </View>
      <View style={styles.dotsRow}>
        {meetingCount > 0 && (
          <>
            <Dot active={selected} />
            {meetingCount > 1 ? <Dot active={selected} /> : null}
            {meetingCount > 2 ? <Dot active={selected} /> : null}
          </>
        )}
      </View>
    </Pressable>
  );
};

const Dot = memo(({active}: {active: boolean}) => (
  <View
    style={[
      styles.dot,
      {backgroundColor: active ? colors.textInverse : colors.primary},
    ]}
  />
));

export const CalendarDayCell = memo(CalendarDayCellBase);

const CELL_HEIGHT = 56;
const BUBBLE_SIZE = 36;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: spacing.xs,
    height: CELL_HEIGHT,
  },
  pressed: {opacity: 0.7},
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleSelected: {backgroundColor: colors.primary},
  bubbleToday: {backgroundColor: colors.primarySoft},
  dotsRow: {
    flexDirection: 'row',
    gap: 3,
    marginTop: spacing.xxs,
    height: 6,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
