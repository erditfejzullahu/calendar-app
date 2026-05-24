import {memo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import BottomSheetModal from '@shared/components/BottomSheetModal';
import {Button} from '@shared/components/Button';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {spacing} from '@shared/theme/spacing';
import {formatPrettyDate} from '@shared/utils/date';
import {meetingCompositeKey} from '@shared/utils/meeting-identity';
import type {Meeting} from '@app-types/meeting';
import {useMeetingsForDay, useUserRole} from '@store/meetings/meetings.selectors';
import {useMeetingsStore} from '@store/meetings/meetings.store';
import {MeetingListItem} from './MeetingListItem';

type Props = {
  visible: boolean;
  dateISO: string | null;
  onClose: () => void;
  onCreate: () => void;
  onSelectMeeting: (meeting: Meeting) => void;
};

export const DayMeetingsSheet = memo(
  ({
    visible,
    dateISO,
    onClose,
    onCreate,
    onSelectMeeting,
  }: Props) => {
    const meetings = useMeetingsForDay(dateISO ?? '');
    const userRole = useUserRole();
    const adminShowAllGlobal = useMeetingsStore(s => s.adminCalendarShowAllGlobal);
    const ownerHints = useMeetingsStore(s => s.ownerHints);
    const showOrganizerSubtitle = userRole === 'admin' && adminShowAllGlobal;

    return (
      <BottomSheetModal
        visible={visible}
        onClose={onClose}
        title={dateISO ? formatPrettyDate(dateISO) : undefined}>
        <View style={styles.actionsRow}>
          <AppText variant="caption" color={colors.textMuted}>
            {meetings.length === 0
              ? 'No meetings yet'
              : `${meetings.length} meeting${meetings.length === 1 ? '' : 's'}`}
          </AppText>
          <Button label="+ New" size="sm" onPress={onCreate} />
        </View>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {meetings.length === 0 ? (
            <View style={styles.empty}>
              <AppText variant="body" color={colors.textMuted} align="center">
                Tap “+ New” to schedule your first meeting on this day.
              </AppText>
            </View>
          ) : (
            meetings.map(m => (
              <MeetingListItem
                key={meetingCompositeKey(m)}
                meeting={m}
                onPress={onSelectMeeting}
                creatorLabel={showOrganizerSubtitle ? ownerHints[m.ownerId] : undefined}
              />
            ))
          )}
        </ScrollView>
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  list: {maxHeight: 380},
  listContent: {paddingBottom: spacing.md},
  empty: {paddingVertical: spacing['2xl']},
});
