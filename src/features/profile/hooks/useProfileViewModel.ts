import {useMemo} from 'react';
import {useAuthUser} from '@store/auth/auth.selectors';
import {useMeetingStats, useUpcomingMeetings} from '@store/meetings/meetings.selectors';

/**
 * Single hook that the profile screen consumes — bundles the user, stats
 * counters and upcoming list into one memoized object so the screen doesn't
 * have to chain four hooks inline.
 */
export const useProfileViewModel = () => {
  const user = useAuthUser();
  const stats = useMeetingStats();
  const upcoming = useUpcomingMeetings(5);
  return useMemo(() => ({user, stats, upcoming}), [user, stats, upcoming]);
};
