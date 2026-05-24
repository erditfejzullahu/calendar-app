import {
  daysInMonth,
  formatMonthYear,
  formatPrettyDate,
  fromDateISO,
  isSameDay,
  toDateISO,
  todayISO,
  weekdayMondayFirst,
} from './date';

describe('date helpers', () => {
  it('round-trips Dates through iso strings locally', () => {
    const d = new Date(2026, 4, 24);
    expect(toDateISO(d)).toBe('2026-05-24');
    expect(fromDateISO('2026-05-24').toDateString()).toBe(d.toDateString());
  });

  it('detects equality ignoring time-of-day components', () => {
    expect(isSameDay(new Date(2026, 4, 24, 1), new Date(2026, 4, 24, 23))).toBe(true);
    expect(isSameDay(new Date(2026, 4, 24), new Date(2026, 4, 25))).toBe(false);
  });

  it('counts correct month length respecting leap years', () => {
    expect(daysInMonth(2026, 1)).toBe(28);
    expect(daysInMonth(2024, 1)).toBe(29);
  });

  it('uses Monday-first weekday indexing', () => {
    expect(weekdayMondayFirst(new Date(2026, 4, 24))).toBe(6); // Sunday maps to index 6
  });

  it('formats month labels for headers', () => {
    expect(formatMonthYear(2026, 0)).toBe('January 2026');
  });

  it('formats human readable labels with weekday prefix', () => {
    expect(formatPrettyDate('2026-05-24')).toMatch(/Sun/);
  });

  it('returns today iso with correct structure', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
