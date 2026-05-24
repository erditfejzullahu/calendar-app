import {memo} from 'react';
import {StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {WEEKDAY_LABELS_SHORT} from '@shared/utils/date';

const CalendarWeekdaysBase = () => (
  <View style={styles.row}>
    {WEEKDAY_LABELS_SHORT.map(label => (
      <View key={label} style={styles.cell}>
        <AppText variant="overline" color={colors.textMuted}>
          {label}
        </AppText>
      </View>
    ))}
  </View>
);

export const CalendarWeekdays = memo(CalendarWeekdaysBase);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
});
