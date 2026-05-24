import {renderHook, act} from '@testing-library/react-native';
import {buildMeeting} from '@testing/factories/meeting.factory';
import {buildAuthUser} from '@testing/factories/user.factory';
import {meetingsService} from '@services/firebase/meetings.service';
import {useAuthStore} from '@store/auth/auth.store';
import {bindMeetingsToUser, useMeetingsStore} from '@store/meetings/meetings.store';
import {useMeetingsForDay} from '@store/meetings/meetings.selectors';
import {buildMeetingSchema} from '../schemas/meeting.schema';
import {useCreateMeetingForm} from './useCreateMeetingForm';

jest.mock('@services/firebase/meetings.service', () => ({
  meetingsService: {
    subscribeAll: jest.fn(() => jest.fn()),
    subscribeMeetingsAcrossAllUsers: jest.fn(() => jest.fn()),
    subscribeUserDocument: jest.fn(() => jest.fn()),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    fetchMeetingFromServer: jest.fn(),
    fetchOwnerDisplayHints: jest.fn(),
    ensureUserDoc: jest.fn(async () => undefined),
  },
}));

const mockedMeetings = jest.mocked(meetingsService);

describe('useCreateMeetingForm', () => {
  const dateISO = '2026-05-24';

  beforeEach(() => {
    jest.clearAllMocks();
    bindMeetingsToUser(null);
    mockedMeetings.subscribeAll.mockReturnValue(() => {});
    mockedMeetings.subscribeMeetingsAcrossAllUsers.mockReturnValue(() => {});
    mockedMeetings.subscribeUserDocument.mockReturnValue(() => {});
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'person-a'}),
      error: null,
      busy: false,
    });
    useMeetingsStore.getState().internal._hydrateMeetings([]);
    mockedMeetings.create.mockResolvedValue(
      buildMeeting({
        ownerId: 'person-a',
        dateISO,
        startsAt: 100,
      }),
    );
    mockedMeetings.update.mockResolvedValue(undefined);
    mockedMeetings.fetchMeetingFromServer.mockResolvedValue(buildMeeting({ownerId: 'person-a'}));
  });

  it('submits drafts through meetings actions for optimistic UX', async () => {
    const createSpy = jest.spyOn(useMeetingsStore.getState().actions, 'createMeeting');

    const {result} = renderHook(() =>
      useCreateMeetingForm({
        dateISO,
        onSuccess: jest.fn(),
      }),
    );

    await act(async () => {
      result.current.form.reset({
        title: 'Retro',
        description: '',
        dateISO,
        startTime: '16:00',
        endTime: '17:15',
      });
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(createSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Retro',
        dateISO,
      }),
    );

    createSpy.mockRestore();
  });

  it('calls updateMeeting when editing an existing slot', async () => {
    const updateSpy = jest.spyOn(useMeetingsStore.getState().actions, 'updateMeeting');

    const meeting = buildMeeting({
      ownerId: 'person-a',
      id: 'meet-777',
      dateISO,
      startTime: '10:00',
      endTime: '11:00',
    });

    const {result} = renderHook(() =>
      useCreateMeetingForm({
        dateISO,
        editing: meeting,
      }),
    );

    await act(async () => {
      result.current.form.setValue('title', 'Retro v2');
    });

    await act(async () => {
      await result.current.submit();
    });

    expect(updateSpy).toHaveBeenCalledWith({id: meeting.id, ownerId: meeting.ownerId}, expect.any(Object));
    expect(mockedMeetings.create).not.toHaveBeenCalled();

    updateSpy.mockRestore();
  });

  it('prevents double-booking the organizer on the same ISO day', async () => {
    const existingMeeting = buildMeeting({
      ownerId: 'person-a',
      dateISO,
      startTime: '10:00',
      endTime: '11:00',
      title: 'Existing',
    });

    await act(async () => {
      useMeetingsStore.getState().internal._hydrateMeetings([existingMeeting]);
    });

    const {result: dayBundle} = renderHook(() => ({
      calendarDay: useMeetingsForDay(dateISO),
      uid: useAuthStore.getState().user?.uid,
    }));

    expect(dayBundle.current.uid).toBe('person-a');
    expect(dayBundle.current.calendarDay.map(meeting => meeting.id)).toEqual([existingMeeting.id]);

    const conflictingValues = {
      title: 'Collision',
      description: '',
      dateISO,
      startTime: '10:30',
      endTime: '11:30',
    } as const;

    const blocked = buildMeetingSchema(
      dayBundle.current.calendarDay.filter(meeting => meeting.ownerId === dayBundle.current.uid),
    ).safeParse(conflictingValues);

    expect(blocked.success).toBe(false);

    const createSpy = jest.spyOn(useMeetingsStore.getState().actions, 'createMeeting');

    const {result} = renderHook(() => useCreateMeetingForm({dateISO}));

    await act(async () => {
      result.current.form.reset(conflictingValues);
      await result.current.submit();
    });

    expect(createSpy).not.toHaveBeenCalled();
    createSpy.mockRestore();
  });
});
