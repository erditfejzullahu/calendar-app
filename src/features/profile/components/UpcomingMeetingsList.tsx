import {memo, useCallback, useEffect, useMemo, useState} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {Button} from '@shared/components/Button';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {formatPrettyDate} from '@shared/utils/date';
import {formatTimeRange} from '@shared/utils/time';
import {meetingCompositeKey} from '@shared/utils/meeting-identity';
import type {Meeting} from '@app-types/meeting';

const PAGE_SIZE = 5;

type Props = {
  meetings: Meeting[];
  onMeetingPress: (meeting: Meeting) => void;
};

const UpcomingMeetingsListBase = ({meetings, onMeetingPress}: Props) => {
  const [page, setPage] = useState(0);

  const total = meetings.length;
  const pageCount = total === 0 ? 0 : Math.ceil(total / PAGE_SIZE);

  useEffect(() => {
    const maxPage = Math.max(0, pageCount - 1);
    setPage(p => Math.min(p, maxPage));
  }, [pageCount, total]);

  const pageMeetings = useMemo(() => {
    const offset = page * PAGE_SIZE;
    return meetings.slice(offset, offset + PAGE_SIZE);
  }, [meetings, page]);

  const goPrev = useCallback(() => setPage(p => Math.max(0, p - 1)), []);
  const goNext = useCallback(() => setPage(p => Math.min(Math.max(0, pageCount - 1), p + 1)), [
    pageCount,
  ]);

  const showPaging = total > PAGE_SIZE;

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <AppText variant="titleSm">Upcoming meetings</AppText>
        <AppText variant="caption" color={colors.textMuted}>
          {total === 0 ? 'None' : `${total} upcoming`}
        </AppText>
      </View>

      {showPaging ? (
        <View style={styles.pagerMeta}>
          <AppText variant="caption" color={colors.textMuted} style={styles.pagerSummary}>
            {`Page ${page + 1} of ${pageCount} · Showing ${page * PAGE_SIZE + 1}–${Math.min(total, (page + 1) * PAGE_SIZE)} of ${total}`}
          </AppText>
          <View style={styles.pagerButtons}>
            <Button
              label="Previous"
              variant="ghost"
              size="sm"
              disabled={page <= 0}
              onPress={goPrev}
            />
            <Button
              label="Next"
              variant="ghost"
              size="sm"
              disabled={page >= pageCount - 1}
              onPress={goNext}
            />
          </View>
        </View>
      ) : null}

      {total === 0 ? (
        <View style={styles.empty}>
          <AppText variant="body" color={colors.textMuted} align="center">
            No upcoming meetings.{'\n'}Schedule one from the Calendar tab.
          </AppText>
        </View>
      ) : (
        <View style={{gap: spacing.sm}}>
          {pageMeetings.map(m => (
            <Pressable
              key={meetingCompositeKey(m)}
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
  );
};

export const UpcomingMeetingsList = memo(UpcomingMeetingsListBase);

const styles = StyleSheet.create({
  section: {paddingHorizontal: spacing.xl, marginTop: spacing.xl, gap: spacing.md},
  headerRow: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  pagerMeta: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pagerSummary: {
    flexWrap: 'wrap',
    lineHeight: 18,
  },
  pagerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
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
