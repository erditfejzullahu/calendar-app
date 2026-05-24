import {memo, useEffect, useState} from 'react';
import {Alert, StyleSheet, View} from 'react-native';
import BottomSheetModal from '@shared/components/BottomSheetModal';
import {Button} from '@shared/components/Button';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {formatPrettyDate} from '@shared/utils/date';
import {formatTimeRange} from '@shared/utils/time';
import type {Meeting} from '@app-types/meeting';
import {useMeetingsActions, useUserRole} from '@store/meetings/meetings.selectors';
import {useAuthStore} from '@store/auth/auth.store';
import {useMeetingsStore} from '@store/meetings/meetings.store';
import {CreateMeetingModal} from './CreateMeetingModal';

type Props = {
  meeting: Meeting | null;
  onClose: () => void;
};

const shortUid = (uid: string) => (uid.length <= 10 ? uid : `${uid.slice(0, 8)}…`);

export const MeetingDetailsModal = memo(({meeting, onClose}: Props) => {
  const {deleteMeeting} = useMeetingsActions();
  const userRole = useUserRole();
  const selfUid = useAuthStore(s => s.user?.uid);
  const ownerHints = useMeetingsStore(s => s.ownerHints);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!meeting) setEditing(false);
  }, [meeting]);

  const detailSheetOpen = Boolean(meeting) && !editing;

  const isOwner = Boolean(meeting && selfUid && meeting.ownerId === selfUid);
  const canMutate = isOwner || userRole === 'admin';

  const organizerLabel =
    meeting && !isOwner
      ? (ownerHints[meeting.ownerId] ?? shortUid(meeting.ownerId)).trim()
      : '';

  const confirmDelete = () => {
    const m = meeting;
    if (!m || !canMutate) return;
    Alert.alert(`Delete "${m.title}"?`, 'This cannot be undone.', [
      {text: 'Cancel', style: 'cancel'},
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteMeeting({id: m.id, ownerId: m.ownerId});
            onClose();
          } catch {
            Alert.alert('Could not delete', 'Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <>
      <BottomSheetModal
        visible={detailSheetOpen}
        onClose={onClose}
        title={meeting?.title}>
        {meeting ? (
          <>
            <View style={styles.row}>
              <View style={styles.pill}>
                <AppText variant="caption" color={colors.primary}>
                  {formatTimeRange(meeting.startTime, meeting.endTime)}
                </AppText>
              </View>
              <AppText variant="caption" color={colors.textMuted}>
                {formatPrettyDate(meeting.dateISO)}
              </AppText>
            </View>

            {organizerLabel ? (
              <View style={styles.orgBlock}>
                <AppText variant="caption" color={colors.textMuted}>
                  ORGANIZER
                </AppText>
                <AppText variant="body" style={styles.orgLabel}>
                  {organizerLabel}
                </AppText>
              </View>
            ) : null}

            {meeting.description ? (
              <View style={styles.descBlock}>
                <AppText variant="caption" color={colors.textMuted}>
                  DESCRIPTION
                </AppText>
                <AppText variant="body" style={styles.descText}>
                  {meeting.description}
                </AppText>
              </View>
            ) : null}

            {canMutate ? (
              <>
                {!isOwner && userRole === 'admin' ? (
                  <AppText variant="caption" color={colors.textMuted} style={styles.adminHint}>
                    Editing as administrator — changes apply to the organizer’s calendar.
                  </AppText>
                ) : null}
                <View style={styles.actions}>
                  <Button label="Edit" variant="secondary" onPress={() => setEditing(true)} />
                  <Button label="Delete" variant="danger" onPress={confirmDelete} />
                </View>
              </>
            ) : (
              <AppText variant="caption" color={colors.textMuted} style={styles.viewOnlyNotice}>
                You can open this organizer’s booking, but only they can edit or delete it from this account.
              </AppText>
            )}
          </>
        ) : null}
      </BottomSheetModal>

      <CreateMeetingModal
        visible={editing && !!meeting}
        dateISO={meeting?.dateISO ?? null}
        editing={meeting ?? undefined}
        onClose={() => {
          setEditing(false);
          onClose();
        }}
      />
    </>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  orgBlock: {gap: spacing.xs, marginBottom: spacing.md},
  orgLabel: {marginTop: spacing.xxs},
  descBlock: {gap: spacing.xs, marginBottom: spacing.lg},
  descText: {marginTop: spacing.xs},
  adminHint: {marginBottom: spacing.md, lineHeight: 18},
  actions: {flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm},
  viewOnlyNotice: {marginTop: spacing.md, lineHeight: 18},
});
