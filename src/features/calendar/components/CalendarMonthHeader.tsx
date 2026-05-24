import {memo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {formatMonthYear} from '@shared/utils/date';

type Props = {
  year: number;
  month: number;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
};

const CalendarMonthHeaderBase = ({year, month, onPrev, onNext, onToday}: Props) => {
  return (
    <View style={styles.row}>
      <AppText variant="titleLg">{formatMonthYear(year, month)}</AppText>
      <View style={styles.controls}>
        <Pressable style={styles.iconBtn} onPress={onPrev} hitSlop={8}>
          <AppText variant="titleSm" color={colors.text}>
            ‹
          </AppText>
        </Pressable>
        <Pressable style={styles.todayBtn} onPress={onToday}>
          <AppText variant="caption" color={colors.primary}>
            Today
          </AppText>
        </Pressable>
        <Pressable style={styles.iconBtn} onPress={onNext} hitSlop={8}>
          <AppText variant="titleSm" color={colors.text}>
            ›
          </AppText>
        </Pressable>
      </View>
    </View>
  );
};

export const CalendarMonthHeader = memo(CalendarMonthHeaderBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  controls: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm},
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
});
