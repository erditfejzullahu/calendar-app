import {useCallback, useMemo} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {buildMeetingSchema, MeetingFormValues} from '../schemas/meeting.schema';
import type {Meeting, MeetingDraft} from '@app-types/meeting';
import {useMeetingsForDay} from '@store/meetings/meetings.selectors';
import {useMeetingsActions} from '@store/meetings/meetings.selectors';
import {useAuthStore} from '@store/auth/auth.store';
import {currentHHmm, hhmmToMinutes, minutesToHHmm} from '@shared/utils/time';

type Params = {
  dateISO: string;
  /** When editing, pass the meeting so its own slot is excluded from the overlap check. */
  editing?: Meeting;
  onSuccess?: () => void;
};

const defaultTimes = () => {
  const start = currentHHmm();
  const end = minutesToHHmm(Math.min(hhmmToMinutes(start) + 60, 23 * 60 + 59));
  return {start, end};
};

export const useCreateMeetingForm = ({dateISO, editing, onSuccess}: Params) => {
  const selfUid = useAuthStore(s => s.user?.uid);
  const allForDay = useMeetingsForDay(dateISO);

  /** Overlap applies only vs the signed-in organizer’s bookings (not vs other users when admin scopes “all”). */
  const meetingsForDay = useMemo(
    () => (selfUid ? allForDay.filter(m => m.ownerId === selfUid) : []),
    [allForDay, selfUid],
  );

  const {createMeeting, updateMeeting} = useMeetingsActions();

  const schema = useMemo(
    () => buildMeetingSchema(meetingsForDay, editing?.id),
    [meetingsForDay, editing?.id],
  );

  const {start, end} = useMemo(defaultTimes, []);

  const form = useForm<MeetingFormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      title: editing?.title ?? '',
      description: editing?.description ?? '',
      dateISO,
      startTime: editing?.startTime ?? start,
      endTime: editing?.endTime ?? end,
    },
  });

  const submit = form.handleSubmit(async values => {
    const draft: MeetingDraft = {
      title: values.title,
      description: values.description || null,
      dateISO: values.dateISO,
      startTime: values.startTime,
      endTime: values.endTime,
    };

    if (editing) {
      await updateMeeting({id: editing.id, ownerId: editing.ownerId}, draft);
    } else {
      await createMeeting(draft);
    }
    onSuccess?.();
  });

  const reset = useCallback(() => form.reset(), [form]);

  return {form, submit, reset};
};
