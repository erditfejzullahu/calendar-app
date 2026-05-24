import {useEffect, useMemo, useState} from 'react';
import type {AssignableDirectoryUser} from '@app-types/user';
import {meetingsService} from '@services/firebase/meetings.service';

/**
 * Streams `/users/{uid}` rows for assigning meeting participants — excludes organizer row by uid.
 */
export const useAssignableUsersDirectory = (
  excludeUid?: string | null,
): {
  loading: boolean;
  users: AssignableDirectoryUser[];
} => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<AssignableDirectoryUser[]>([]);

  useEffect(() => {
    const unsub = meetingsService.subscribeUsersDirectory(
      incoming => {
        setRows(incoming);
        setLoading(false);
      },
      () => {
        setLoading(false);
      },
    );
    return unsub;
  }, []);

  const users = useMemo(
    () => rows.filter(u => !(excludeUid && u.uid === excludeUid)),
    [excludeUid, rows],
  );

  return {loading, users};
};
