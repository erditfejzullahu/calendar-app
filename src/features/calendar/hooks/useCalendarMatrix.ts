import {useMemo} from 'react';
import {
  daysInMonth,
  toDateISO,
  todayISO,
  weekdayMondayFirst,
} from '@shared/utils/date';

export type DayCell = {
  /** e.g. '2026-05-23' */
  dateISO: string;
  /** Day-of-month label (1..31). */
  day: number;
  inCurrentMonth: boolean;
  isToday: boolean;
};

/**
 * Builds a 6×7 = 42 cell matrix for the given (year, month), Monday first,
 * with leading/trailing days from the adjacent months. Pure & memoized.
 */
export const useCalendarMatrix = (year: number, month: number): DayCell[][] => {
  return useMemo(() => {
    const first = new Date(year, month, 1);
    const leading = weekdayMondayFirst(first);
    const totalDaysCurrent = daysInMonth(year, month);

    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    const totalDaysPrev = daysInMonth(prevYear, prevMonth);

    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;

    const today = todayISO();

    const cells: DayCell[] = [];

    // Leading days from previous month.
    for (let i = leading - 1; i >= 0; i--) {
      const day = totalDaysPrev - i;
      const dateISO = toDateISO(new Date(prevYear, prevMonth, day));
      cells.push({dateISO, day, inCurrentMonth: false, isToday: dateISO === today});
    }

    // Current month days.
    for (let day = 1; day <= totalDaysCurrent; day++) {
      const dateISO = toDateISO(new Date(year, month, day));
      cells.push({dateISO, day, inCurrentMonth: true, isToday: dateISO === today});
    }

    // Trailing days from next month so we always render exactly 42 cells.
    let nextDay = 1;
    while (cells.length < 42) {
      const dateISO = toDateISO(new Date(nextYear, nextMonth, nextDay));
      cells.push({dateISO, day: nextDay, inCurrentMonth: false, isToday: dateISO === today});
      nextDay++;
    }

    const rows: DayCell[][] = [];
    for (let r = 0; r < 6; r++) {
      rows.push(cells.slice(r * 7, r * 7 + 7));
    }
    return rows;
  }, [year, month]);
};
