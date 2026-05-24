import {memo, useMemo, useState} from 'react';
import type {Control} from 'react-hook-form';
import {Controller} from 'react-hook-form';
import {FlatList, Pressable, StyleSheet, View} from 'react-native';
import type {AssignableDirectoryUser} from '@app-types/user';
import {AppText} from '@shared/components/Text';
import {TextField} from '@shared/components/TextField';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import type {MeetingFormValues} from '../schemas/meeting.schema';
import {useAssignableUsersDirectory} from '../hooks/useAssignableUsersDirectory';

const compactUserLabel = (u: AssignableDirectoryUser): string =>
  [u.displayName?.trim(), u.email?.trim()].filter(Boolean).join(' · ') ||
  (u.uid.length <= 10 ? u.uid : `${u.uid.slice(0, 8)}…`);

type Props = {
  control: Control<MeetingFormValues>;
  /** Organizer Firebase uid — prevents self-invite picker rows when creating on your behalf. */
  excludeUid?: string | null;
};

export const ParticipantAssignmentsField = memo(({control, excludeUid}: Props) => {
  const [query, setQuery] = useState('');
  const {users, loading} = useAssignableUsersDirectory(excludeUid);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter(row => {
      const haystack = `${row.displayName ?? ''} ${row.email ?? ''} ${row.uid}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [users, query]);

  const toggleParticipant = (
    currentIds: string[],
    nextUid: string,
    change: (val: MeetingFormValues['participantIds']) => void,
  ): void => {
    const setLike = new Set(currentIds ?? []);
    if (setLike.has(nextUid)) {
      setLike.delete(nextUid);
    } else {
      setLike.add(nextUid);
    }
    change([...setLike]);
  };

  return (
    <Controller
      control={control}
      name="participantIds"
      render={({field: {value, onChange}}) => (
        <View style={styles.block}>
          <AppText variant="caption" color={colors.textMuted} style={styles.label}>
            People (optional)
          </AppText>
          <TextField
            label="Find someone"
            placeholder="Search display name or email"
            autoCapitalize="none"
            autoCorrect={false}
            value={query}
            onChangeText={setQuery}
          />

          {(value ?? []).length > 0 ? (
            <AppText variant="caption" color={colors.textMuted} style={styles.selectedSummary}>
              {`${(value ?? []).length} participant${(value ?? []).length === 1 ? '' : 's'} selected`}
            </AppText>
          ) : loading ? (
            <AppText variant="caption" color={colors.textMuted}>
              Loading directory…
            </AppText>
          ) : null}

          {!loading && filtered.length === 0 ? (
            <AppText variant="caption" color={colors.textMuted}>
              {users.length === 0 ? 'No other profiles yet.' : 'No matching users.'}
            </AppText>
          ) : null}

          <FlatList
            data={filtered.slice(0, 40)}
            keyExtractor={row => row.uid}
            nestedScrollEnabled
            scrollEnabled={false}
            keyboardShouldPersistTaps="handled"
            style={styles.list}
            ItemSeparatorComponent={() => <View style={styles.sep} />}
            renderItem={({item}) => {
              const picked = Boolean((value ?? []).includes(item.uid));
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{checked: picked}}
                  onPress={() => toggleParticipant(value ?? [], item.uid, onChange)}
                  style={({pressed}) => [styles.row, pressed && styles.rowPressed]}
                  accessibilityLabel={`Invite ${compactUserLabel(item)}`}>
                  <View style={[styles.tick, picked && styles.tickOn]} />
                  <View style={styles.rowText}>
                    <AppText variant="bodyStrong" numberOfLines={1}>
                      {compactUserLabel(item)}
                    </AppText>
                    {/* <AppText variant="caption" color={colors.textMuted} numberOfLines={1}>
                      {item.uid}
                    </AppText> */}
                  </View>
                </Pressable>
              );
            }}
          />
        </View>
      )}
    />
  );
});

const styles = StyleSheet.create({
  block: {gap: spacing.sm},
  label: {marginLeft: spacing.xxs},
  selectedSummary: {marginLeft: spacing.xxs},
  list: {maxHeight: 220},
  sep: {height: 1, backgroundColor: colors.border},
  row: {flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm},
  rowPressed: {opacity: 0.88},
  tick: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tickOn: {borderColor: colors.primary, backgroundColor: colors.primarySoft},
  rowText: {flex: 1, gap: spacing.xxs},
});
