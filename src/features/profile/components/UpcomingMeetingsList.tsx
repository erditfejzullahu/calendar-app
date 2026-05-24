import {memo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {formatPrettyDate} from '@shared/utils/date';
import {formatTimeRange} from '@shared/utils/time';
import type {Meeting} from '@app-types/meeting';

type Props = {
  meetings: Meeting[];
  onMeetingPress: (meeting: Meeting) => void;
};

export const UpcomingMeetingsList = memo(({meetings, onMeetingPress}: Props) => (
  <View style={styles.section}>
    <View style={styles.headerRow}>
      <AppText variant="titleSm">Upcoming meetings</AppText>
      <AppText variant="caption" color={colors.textMuted}>
        Next {meetings.length}
      </AppText>
    </View>

    {meetings.length === 0 ? (
      <View style={styles.empty}>
        <AppText variant="body" color={colors.textMuted} align="center">
          No upcoming meetings.{'\n'}Schedule one from the Calendar tab.
        </AppText>
      </View>
    ) : (
      <View style={{gap: spacing.sm}}>
        {meetings.map(m => (
          <Pressable
            key={m.id}
            accessibilityRole="button"
            accessibilityHint="Opens meeting details"
            accessibilityLabel={`${m.title}, ${formatPrettyDate(m.dateISO)}, ${formatTimeRange(m.startTime, m.endTime)}`}
            style={({pressed}) => [styles.item, pressed && styles.itemPressed]}
            onPress={() => onMeetingPress(m)}>
            <View style={styles.itemHead}>
              <AppText variant="titleSm">{m.title}</AppText>
              <View style={styles.pill}>
                <AppText variant="caption" color={colors.primary}>
                  {formatTimeRange(m.startTime, m.endTime)}
                </AppText>
              </View>
            </View>
            <AppText variant="caption" color={colors.textMuted}>
              {formatPrettyDate(m.dateISO)}
            </AppText>
          </Pressable>
        ))}
      </View>
    )}
  </View>
));

const styles = StyleSheet.create({
  section: {paddingHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.md},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  empty: {
    paddingVertical: spacing['2xl'],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  item: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.xs,
  },
  itemPressed: {
    opacity: 0.88,
    borderColor: colors.primarySoft,
  },
  itemHead: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
});
