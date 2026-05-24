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
import {CreateMeetingFormBody} from './CreateMeetingModal';

type Props = {
  meeting: Meeting | null;
  onClose: () => void;
};

const shortUid = (uid: string) => (uid.length <= 10 ? uid : `${uid.slice(0, 8)}…`);

export const MeetingDetailsModal = memo(({meeting, onClose}: Props) => {
  const {deleteMeeting} = useMeetingsActions();
  const prefetchUserProfilesForMeetings = useMeetingsStore(s => s.actions.prefetchUserProfilesForMeetings);
  const userRole = useUserRole();
  const selfUid = useAuthStore(s => s.user?.uid);
  const ownerHints = useMeetingsStore(s => s.ownerHints);
  const userPeekByUid = useMeetingsStore(s => s.userPeekByUid);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!meeting) setEditing(false);
  }, [meeting]);

  useEffect(() => {
    if (!meeting) return;
    prefetchUserProfilesForMeetings([meeting]);
  }, [meeting, prefetchUserProfilesForMeetings]);

  const sheetOpen = Boolean(meeting);

  const isOwner = Boolean(meeting && selfUid && meeting.ownerId === selfUid);
  const canMutate = isOwner || userRole === 'admin';
  const participateAsInviteeOnly = Boolean(
    meeting &&
      selfUid &&
      meeting.ownerId !== selfUid &&
      meeting.participantIds.includes(selfUid),
  );

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
    <BottomSheetModal
      visible={sheetOpen}
      onClose={onClose}
      title={editing ? 'Edit meeting' : meeting?.title}>
      {meeting && editing ? (
        <CreateMeetingFormBody
          key={`${meeting.ownerId}:${meeting.id}`}
          dateISO={meeting.dateISO}
          editing={meeting}
          onClose={() => {
            setEditing(false);
            onClose();
          }}
        />
      ) : meeting ? (
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

            {participateAsInviteeOnly ? (
              <View style={styles.guestBadge}>
                <AppText variant="caption" color={colors.primary}>
                  You're on the guest list
                </AppText>
              </View>
            ) : null}

            {meeting && meeting.participantIds.length > 0 ? (
              <View style={styles.attendees}>
                <AppText variant="caption" color={colors.textMuted}>
                  PARTICIPANTS ({meeting.participantIds.length})
                </AppText>
                <View style={styles.attendeeList}>
                  {meeting.participantIds.map(uid => {
                    const peekLoaded = uid in userPeekByUid;
                    const peek = userPeekByUid[uid];

                    if (!peekLoaded) {
                      return (
                        <View key={uid} style={styles.attendeeRow}>
                          <AppText variant="caption" color={colors.textMuted}>
                            Loading profile…
                          </AppText>
                        </View>
                      );
                    }

                    const name = peek.displayName.trim();
                    const email = peek.email.trim();
                    const hintLine = ownerHints[uid]?.trim() ?? '';

                    if (name && email) {
                      return (
                        <View key={uid} style={styles.attendeeRow}>
                          <AppText variant="bodyStrong" numberOfLines={1}>
                            {name}
                          </AppText>
                          <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                            {email}
                          </AppText>
                        </View>
                      );
                    }

                    const singleLine = name || email || hintLine || 'Attendee profile unavailable';

                    return (
                      <View key={uid} style={styles.attendeeRow}>
                        <AppText variant="bodyStrong" numberOfLines={1}>
                          {singleLine}
                        </AppText>
                      </View>
                    );
                  })}
                </View>
              </View>
            ) : null}

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
            ) : participateAsInviteeOnly ? (
              <AppText variant="caption" color={colors.textMuted} style={styles.viewOnlyNotice}>
                You were invited — the organizer updates this meeting if anything changes.
              </AppText>
            ) : (
              <AppText variant="caption" color={colors.textMuted} style={styles.viewOnlyNotice}>
                You can open this organizer’s booking, but only they can edit or delete it from this account.
              </AppText>
            )}
          </>
      ) : null}
    </BottomSheetModal>
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
  guestBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    marginBottom: spacing.md,
  },
  attendees: {gap: spacing.xs, marginBottom: spacing.md},
  attendeeList: {gap: spacing.sm},
  attendeeRow: {gap: spacing.xxs},
});
