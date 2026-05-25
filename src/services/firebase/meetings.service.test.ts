import {buildMeetingDraft} from '@testing/factories/meeting-draft.factory';
import * as NativeFirestore from '@react-native-firebase/firestore';
import {getDoc, getDocFromServer, increment, runTransaction, setDoc} from '@react-native-firebase/firestore';
import type {Meeting} from '@app-types/meeting';
import {DEFAULT_USER_ROLE, emptyUserStats} from '@app-types/user';
import {meetingsService, sanitizeParticipantIdsForPersist} from './meetings.service';

describe('meetings.service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('sanitizeParticipantIdsForPersist', () => {
    it('dedupes, trims participants, and never keeps the organizer', () => {
      expect(sanitizeParticipantIdsForPersist('org', ['  a ', 'org', 'b', 'a', ''])).toEqual(['a', 'b']);
    });

    it('returns [] for non-array input', () => {
      expect(sanitizeParticipantIdsForPersist('org', undefined)).toEqual([]);
    });
  });

  describe('fetchMeetingFromServer', () => {
    it('returns null when the server doc is missing', async () => {
      jest.mocked(getDocFromServer).mockResolvedValueOnce({
        exists: () => false,
        id: 'x',
        data: () => ({}),
      } as never);
      await expect(meetingsService.fetchMeetingFromServer('owner', 'mid')).resolves.toBeNull();
    });

    it('maps well-formed payloads', async () => {
      jest.mocked(getDocFromServer).mockResolvedValueOnce({
        exists: () => true,
        id: 'mid',
        data: () => ({
          ownerId: '',
          title: 'T',
          dateISO: '2026-06-01',
          startTime: '09:00',
          endTime: '10:00',
          description: null,
          participantIds: ['p1'],
          startsAt: 100,
          endsAt: 200,
          createdAt: 1,
          updatedAt: 2,
        }),
      } as never);
      const m = await meetingsService.fetchMeetingFromServer('owner', 'mid');
      expect((m as Meeting).ownerId).toBe('owner');
      expect((m as Meeting).id).toBe('mid');
      expect((m as Meeting).participantIds).toEqual(['p1']);
    });
  });

  describe('fetchMeetingUserDisplayBundle', () => {
    it('falls back to a uid snippet when the profile doc does not exist', async () => {
      jest.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: 'ghost',
        data: () => ({}),
      } as never);
      const bundle = await meetingsService.fetchMeetingUserDisplayBundle(['ghost']);
      expect(bundle.ownerHints.ghost).toBe('ghost');
      expect(bundle.userPeekByUid.ghost).toEqual({displayName: '', email: ''});
    });

    it('prefers displayName/email hints when strings are present', async () => {
      jest.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'u1',
        data: () => ({displayName: ' Zed ', email: ' z@z.com '}),
      } as never);
      const bundle = await meetingsService.fetchMeetingUserDisplayBundle(['u1']);
      expect(bundle.ownerHints.u1).toBe('Zed · z@z.com');
      expect(bundle.userPeekByUid.u1).toEqual({displayName: 'Zed', email: 'z@z.com'});
    });
  });

  describe('fetchOwnerDisplayHints', () => {
    it('returns only legacy hint mapping', async () => {
      jest.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: '',
        data: () => ({}),
      } as never);
      const hints = await meetingsService.fetchOwnerDisplayHints(['solo']);
      expect(hints.solo).toBe('solo');
    });
  });

  describe('ensureUserDoc', () => {
    it('creates a brand new profile with default role + stats', async () => {
      jest.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false,
        id: 'uid',
        data: () => ({}),
      } as never);

      await meetingsService.ensureUserDoc('uid', 'email@test.com', 'Name');

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'email@test.com',
          displayName: 'Name',
          stats: emptyUserStats(),
          role: DEFAULT_USER_ROLE,
        }),
      );
    });

    it('merges email/displayName and adds role when role field is malformed', async () => {
      jest.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'uid',
        data: () => ({role: 'unknown-role'}),
      } as never);

      await meetingsService.ensureUserDoc('uid', 'e@example.com', 'Ada');

      expect(setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({email: 'e@example.com', displayName: 'Ada', role: DEFAULT_USER_ROLE}),
        {merge: true},
      );
    });

    it('respects admins without forcing DEFAULT_USER_ROLE', async () => {
      jest.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        id: 'uid',
        data: () => ({role: 'admin'}),
      } as never);

      await meetingsService.ensureUserDoc('uid', 'e@example.com', 'Ada');

      const [, payload] = jest.mocked(setDoc).mock.calls[0];
      expect(payload).toEqual({email: 'e@example.com', displayName: 'Ada'});
    });
  });

  describe('create', () => {
    it('stores meeting payload + increments meetingsCreated atomically', async () => {
      let capturedSet!: jest.Mock;

      jest.mocked(runTransaction).mockImplementation(async (_, fn) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          get: jest.fn(async () => ({exists: () => false, data: () => ({})})),
        };
        capturedSet = tx.set;
        await fn(tx as never);
      });

      await meetingsService.create(
        'self',
        buildMeetingDraft({title: '  Title ', participantIds: ['guest']}),
      );

      expect(capturedSet).toHaveBeenCalledTimes(2);
      const savedMeeting = capturedSet.mock.calls[0][1] as Meeting;
      expect(savedMeeting.title).toBe('Title');
      expect(savedMeeting.ownerId).toBe('self');
      expect(savedMeeting.participantIds).toEqual(['guest']);
      expect(savedMeeting.startsAt).toEqual(expect.any(Number));

      expect(capturedSet.mock.calls[1][1]).toEqual(
        expect.objectContaining({stats: {meetingsCreated: increment(1)}}),
      );
    });
  });

  describe('update', () => {
    it('throws when transaction snapshot owner mismatch', async () => {
      jest.mocked(runTransaction).mockImplementation(async (_, fn) => {
        const tx = {
          set: jest.fn(),
          update: jest.fn(),
          delete: jest.fn(),
          get: jest.fn(async () => ({
            exists: () => true,
            data: () => ({ownerId: 'someone-else'}),
          })),
        };
        return fn(tx as never);
      });

      await expect(meetingsService.update('self', 'm1', buildMeetingDraft({title: 'x'}))).rejects.toThrow(
        'Meeting not found.',
      );
    });
  });

  describe('subscribeAll', () => {
    it('maps Firestore docs into Meeting models', () => {
      const next = jest.fn();
      const spy = jest.spyOn(NativeFirestore, 'onSnapshot').mockImplementation(
        (((_query: unknown, observer: {next: (snap: unknown) => void}) => {
          observer.next({
            docs: [
              {
                id: 'm1',
                data: () => ({
                  ownerId: 'self',
                  title: 'Hi',
                  dateISO: '2026-05-24',
                  startTime: '10:00',
                  endTime: '11:00',
                  description: null,
                  participantIds: [],
                  startsAt: 10,
                  endsAt: 11,
                  createdAt: 1,
                  updatedAt: 2,
                }),
              },
            ],
          });
          return jest.fn();
        }) as unknown) as typeof NativeFirestore.onSnapshot,
      );

      meetingsService.subscribeAll('self', next, jest.fn());

      spy.mockRestore();

      expect(next).toHaveBeenCalledWith([
        expect.objectContaining({id: 'm1', ownerId: 'self', title: 'Hi'}),
      ]);
    });
  });
});
