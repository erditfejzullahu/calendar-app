import {memo} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';
import {AppText} from '@shared/components/Text';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import type {Meeting} from '@app-types/meeting';

type Props = {
  meeting: Meeting;
  onPress: (meeting: Meeting) => void;
  creatorLabel?: string | null;
  /** Extra muted line beneath title (e.g. invitation context). */
  subtitle?: string | null;
};

const MeetingListItemBase = memo(({meeting, onPress, creatorLabel, subtitle}: Props) => (
  <Pressable
    onPress={() => onPress(meeting)}
    style={({pressed}) => [styles.root, pressed && styles.pressed]}>
    <View style={styles.timeCol}>
      <AppText variant="bodyStrong" color={colors.primary}>
        {meeting.startTime}
      </AppText>
      <AppText variant="caption" color={colors.textMuted}>
        {meeting.endTime}
      </AppText>
    </View>
    <View style={styles.divider} />
    <View style={styles.bodyCol}>
      <AppText variant="titleSm" numberOfLines={1}>
        {meeting.title}
      </AppText>
      {creatorLabel?.trim() ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          Organizer · {creatorLabel.trim()}
        </AppText>
      ) : null}
      {subtitle?.trim() ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
          {subtitle.trim()}
        </AppText>
      ) : null}
      {meeting.description ? (
        <AppText variant="caption" color={colors.textMuted} numberOfLines={2}>
          {meeting.description}
        </AppText>
      ) : null}
    </View>
  </Pressable>
));

export const MeetingListItem = memo(MeetingListItemBase);

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pressed: {opacity: 0.85},
  timeCol: {
    width: 60,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  divider: {
    width: 3,
    borderRadius: 3,
    backgroundColor: colors.primarySoft,
    marginHorizontal: spacing.md,
  },
  bodyCol: {flex: 1, justifyContent: 'center'},
});
