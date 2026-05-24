import {Controller, useWatch} from 'react-hook-form';
import {memo, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, View} from 'react-native';
import BottomSheetModal from '@shared/components/BottomSheetModal';
import {Button} from '@shared/components/Button';
import {TextField} from '@shared/components/TextField';
import {AppText} from '@shared/components/Text';
import TimePickerBottomSheet from '@shared/components/TimePickerBottomSheet';
import {colors} from '@shared/theme/colors';
import {radius} from '@shared/theme/radius';
import {spacing} from '@shared/theme/spacing';
import {formatPrettyDate} from '@shared/utils/date';
import {useAuthStore} from '@store/auth/auth.store';
import {useCreateMeetingForm} from '../hooks/useCreateMeetingForm';
import type {Meeting} from '@app-types/meeting';
import {ParticipantAssignmentsField} from './ParticipantAssignmentsField';

type Props = {
  visible: boolean;
  dateISO: string | null;
  editing?: Meeting;
  onClose: () => void;
};

type FormBodyProps = {
  dateISO: string;
  editing?: Meeting;
  onClose: () => void;
};

export const CreateMeetingModal = memo(({visible, dateISO, editing, onClose}: Props) => {
  const ready = Boolean(visible && dateISO);

  return (
    <BottomSheetModal visible={ready} onClose={onClose} title={editing ? 'Edit meeting' : 'New meeting'}>
      {ready ? (
        <FormBody
          key={editing ? `${editing.ownerId}:${editing.id}` : dateISO}
          dateISO={dateISO!}
          editing={editing}
          onClose={onClose}
        />
      ) : null}
    </BottomSheetModal>
  );
});

type TimeFieldKey = 'startTime' | 'endTime';

const FormBody = memo(({dateISO, editing, onClose}: FormBodyProps) => {
  const organizerUid = editing?.ownerId ?? useAuthStore(s => s.user?.uid);
  const {form, submit} = useCreateMeetingForm({
    dateISO,
    editing,
    onSuccess: onClose,
  });
  const {control, formState} = form;
  const startTimeWatch = useWatch({control, name: 'startTime'});
  const endTimeWatch = useWatch({control, name: 'endTime'});
  const [timePickerKind, setTimePickerKind] = useState<TimeFieldKey | null>(null);

  const pickerInitial = useMemo(() => {
    if (timePickerKind === 'startTime') return startTimeWatch;
    if (timePickerKind === 'endTime') return endTimeWatch;
    return '09:00';
  }, [timePickerKind, startTimeWatch, endTimeWatch]);

  const pickerTitle =
    timePickerKind === 'startTime' ? 'Start time' : timePickerKind === 'endTime' ? 'End time' : '';

  return (
    <>
      <Controller control={control} name="startTime" render={() => <></>} />
      <Controller control={control} name="endTime" render={() => <></>} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        overScrollMode="never"
        bounces={false}>
      <AppText variant="caption" color={colors.textMuted}>
        {formatPrettyDate(dateISO)}
      </AppText>

      <Controller
        control={control}
        name="title"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Title"
            placeholder="Team sync"
            value={value}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.title?.message}
          />
        )}
      />

      <View style={styles.row}>
        <View style={styles.half}>
          <AppText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            Start
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose start time"
            style={[styles.timeTouchable, !!formState.errors.startTime?.message && styles.timeTouchableError]}
            onPress={() => setTimePickerKind('startTime')}>
            <AppText variant="bodyStrong">{startTimeWatch}</AppText>
          </Pressable>
          {formState.errors.startTime?.message ? (
            <AppText variant="caption" color={colors.danger} style={styles.fieldError}>
              {formState.errors.startTime.message}
            </AppText>
          ) : null}
        </View>
        <View style={styles.half}>
          <AppText variant="caption" color={colors.textMuted} style={styles.fieldLabel}>
            End
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Choose end time"
            style={[styles.timeTouchable, !!formState.errors.endTime?.message && styles.timeTouchableError]}
            onPress={() => setTimePickerKind('endTime')}>
            <AppText variant="bodyStrong">{endTimeWatch}</AppText>
          </Pressable>
          {formState.errors.endTime?.message ? (
            <AppText variant="caption" color={colors.danger} style={styles.fieldError}>
              {formState.errors.endTime.message}
            </AppText>
          ) : null}
        </View>
      </View>

      <Controller
        control={control}
        name="description"
        render={({field: {value, onChange, onBlur}}) => (
          <TextField
            label="Description (optional)"
            placeholder="Agenda, links, notes…"
            multiline
            value={value ?? ''}
            onChangeText={onChange}
            onBlur={onBlur}
            error={formState.errors.description?.message}
          />
        )}
      />

      <ParticipantAssignmentsField control={control} excludeUid={organizerUid ?? null} />

      <Button
        label={editing ? 'Save changes' : 'Create meeting'}
        onPress={submit}
        loading={formState.isSubmitting}
        fullWidth
        size="lg"
      />
    </ScrollView>

    <TimePickerBottomSheet
      visible={timePickerKind !== null}
      title={pickerTitle}
      initialHHmm={pickerInitial}
      onClose={() => setTimePickerKind(null)}
      onConfirm={hhmm => {
        if (timePickerKind === 'startTime' || timePickerKind === 'endTime') {
          form.setValue(timePickerKind, hhmm, {
            shouldValidate: true,
            shouldTouch: true,
            shouldDirty: true,
          });
        }
      }}
    />
    </>
  );
});

const styles = StyleSheet.create({
  body: {gap: spacing.md, paddingBottom: spacing.lg},
  row: {flexDirection: 'row', gap: spacing.md},
  half: {flex: 1},
  fieldLabel: {marginBottom: spacing.xs, marginLeft: spacing.xxs},
  timeTouchable: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    minHeight: 52,
    justifyContent: 'center',
  },
  timeTouchableError: {borderColor: colors.danger},
  fieldError: {marginTop: spacing.xs, marginLeft: spacing.xxs},
});
