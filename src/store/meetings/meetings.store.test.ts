import {buildMeetingDraft} from '@testing/factories/meeting-draft.factory';
import {buildMeeting} from '@testing/factories/meeting.factory';
import {buildAuthUser} from '@testing/factories/user.factory';
import {meetingsService} from '@services/firebase/meetings.service';
import {useAuthStore} from '@store/auth/auth.store';
import {bindMeetingsToUser, useMeetingsStore} from './meetings.store';

jest.mock('@services/firebase/meetings.service', () => ({
  meetingsService: {
    subscribeAll: jest.fn(() => jest.fn()),
    subscribeMeetingsAcrossAllUsers: jest.fn(() => jest.fn()),
    subscribeMeetingsWhereUserIsParticipant: jest.fn(() => jest.fn()),
    subscribeOwnMeetingsMergedWithParticipantInvites: jest.fn(() => jest.fn()),
    subscribeUsersDirectory: jest.fn(() => jest.fn()),
    subscribeUserDocument: jest.fn(() => jest.fn()),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    fetchMeetingFromServer: jest.fn(),
    fetchMeetingUserDisplayBundle: jest.fn(async () => ({ownerHints: {}, userPeekByUid: {}})),
    fetchOwnerDisplayHints: jest.fn(),
    ensureUserDoc: jest.fn(async () => undefined),
  },
}));

const mockedMeetings = jest.mocked(meetingsService);

describe('meetings.store actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bindMeetingsToUser(null);
    mockedMeetings.subscribeOwnMeetingsMergedWithParticipantInvites.mockReturnValue(() => {});
    mockedMeetings.subscribeMeetingsAcrossAllUsers.mockReturnValue(() => {});
    mockedMeetings.subscribeUserDocument.mockReturnValue(() => {});
    useAuthStore.setState({
      status: 'authenticated',
      user: buildAuthUser({uid: 'self'}),
      busy: false,
      error: null,
    });
  });

  describe('createMeeting', () => {
    it('persists draft server-side then merges optimistic copy into indexes', async () => {
      const created = buildMeeting({
        ownerId: 'self',
        id: 'new-id',
      });
      mockedMeetings.create.mockResolvedValue(created);

      const draft = buildMeetingDraft();
      const returned = await useMeetingsStore.getState().actions.createMeeting(draft);

      expect(mockedMeetings.create).toHaveBeenCalledWith('self', draft);
      expect(returned).toEqual(created);
      const key = 'self:new-id';
      expect(useMeetingsStore.getState().byId[key]).toEqual(created);
    });

    it('throws when Firebase session is absent', async () => {
      useAuthStore.setState({user: null, status: 'unauthenticated'});
      await expect(useMeetingsStore.getState().actions.createMeeting(buildMeetingDraft())).rejects.toThrow(
        'Not authenticated',
      );
    });
  });

  describe('updateMeeting', () => {
    it('refetches authoritative server projection after mutate', async () => {
      const target = buildMeeting({
        ownerId: 'self',
        id: 'm1',
        title: 'Before',
      });
      const fresh = {...target, title: 'After', updatedAt: 999};
      mockedMeetings.fetchMeetingFromServer.mockResolvedValue(fresh);

      await useMeetingsStore.getState().actions.updateMeeting(
        {id: target.id, ownerId: target.ownerId},
        buildMeetingDraft({title: 'After'}),
      );

      expect(mockedMeetings.update).toHaveBeenCalled();
      expect(mockedMeetings.fetchMeetingFromServer).toHaveBeenCalledWith('self', 'm1');
      expect(useMeetingsStore.getState().byId['self:m1']).toEqual(fresh);
    });

    it('allows admins to mutate another organizer meeting', async () => {
      const target = buildMeeting({ownerId: 'other-user', id: 'm-remote'});
      useMeetingsStore.setState({userRole: 'admin'});
      useAuthStore.setState({
        status: 'authenticated',
        user: buildAuthUser({uid: 'admin-user'}),
      });
      mockedMeetings.fetchMeetingFromServer.mockResolvedValue(target);

      await expect(
        useMeetingsStore.getState().actions.updateMeeting({id: target.id, ownerId: target.ownerId}, buildMeetingDraft()),
      ).resolves.toBeUndefined();
    });

    it('blocks cross-user edits for non-admins', async () => {
      const target = buildMeeting({
        ownerId: 'foreign',
        id: 'm-remote',
      });
      await expect(
        useMeetingsStore.getState().actions.updateMeeting({id: target.id, ownerId: target.ownerId}, buildMeetingDraft()),
      ).rejects.toThrow('Only the organizer or an admin can modify');
    });
  });

  describe('deleteMeeting', () => {
    it('removes local indexes after Firebase delete succeeds', async () => {
      const target = buildMeeting({ownerId: 'self'});
      mockedMeetings.remove.mockResolvedValue(undefined);
      useMeetingsStore.getState().internal._hydrateMeetings([target]);

      await useMeetingsStore.getState().actions.deleteMeeting({id: target.id, ownerId: target.ownerId});
      expect(mockedMeetings.remove).toHaveBeenCalledWith(target.ownerId, target.id);
      expect(useMeetingsStore.getState().byId['self:meeting-1']).toBeUndefined();
    });

    it('blocks deletes for unrelated clients', async () => {
      const target = buildMeeting({ownerId: 'foreign'});
      await expect(useMeetingsStore.getState().actions.deleteMeeting(target)).rejects.toThrow(
        'Only the organizer or an admin can modify',
      );
    });
  });

  describe('internal._hydrateMeetings', () => {
    it('prefers the newest revision when keyed by owner + id pair', () => {
      const base = buildMeeting({
        ownerId: 'self',
        id: 'alpha',
        title: 'Stale',
        updatedAt: 1,
        startsAt: 10,
      });
      const newer = {...base, title: 'Winner', updatedAt: 900};

      useMeetingsStore.getState().internal._hydrateMeetings([base]);
      useMeetingsStore.getState().internal._hydrateMeetings([newer]);

      expect(useMeetingsStore.getState().byId['self:alpha']?.title).toBe('Winner');
    });
  });
});
