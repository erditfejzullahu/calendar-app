import type {Meeting} from '@app-types/meeting';
import {hhmmToMinutes} from '@shared/utils/time';

/**
 * Half-open interval overlap: [s1, e1) overlaps [s2, e2) iff s1 < e2 && s2 < e1
 */
export const intervalsOverlap = (
  s1: number,
  e1: number,
  s2: number,
  e2: number,
): boolean => s1 < e2 && s2 < e1;

/**
 * Returns the first meeting on the same day that overlaps the proposed
 * [startTime, endTime) window, ignoring `ignoreId` (used when editing).
 */
export const findOverlappingMeeting = (
  meetingsForDay: Meeting[],
  startTime: string,
  endTime: string,
  ignoreId?: string,
): Meeting | undefined => {
  const s = hhmmToMinutes(startTime);
  const e = hhmmToMinutes(endTime);
  return meetingsForDay.find(m => {
    if (ignoreId && m.id === ignoreId) return false;
    return intervalsOverlap(s, e, hhmmToMinutes(m.startTime), hhmmToMinutes(m.endTime));
  });
};
