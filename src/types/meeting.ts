/**
 * A meeting is keyed by an ISO day plus a HH:mm time window. We also persist
 * the absolute start/end timestamps so we can run cheap range queries
 * (e.g. "upcoming") without re-parsing strings on the client.
 */
export type Meeting = {
  id: string;
  ownerId: string;
  /**
   * Other attendees (Firestore `participantIds`). Organizer is implicit and not stored here.
   */
  participantIds: string[];
  title: string;
  description: string | null;
  dateISO: string;       // YYYY-MM-DD
  startTime: string;     // HH:mm
  endTime: string;       // HH:mm
  startsAt: number;      // epoch ms
  endsAt: number;        // epoch ms
  createdAt: number;     // epoch ms
  updatedAt: number;     // epoch ms
};

export type MeetingDraft = Pick<
  Meeting,
  'title' | 'description' | 'dateISO' | 'startTime' | 'endTime' | 'participantIds'
>;
