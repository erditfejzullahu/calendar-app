/**
 * Pure date helpers. No external libraries are used here so that the calendar
 * grid remains 100% hand-rolled.
 */

export const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

export const WEEKDAY_LABELS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

const pad2 = (n: number): string => (n < 10 ? `0${n}` : `${n}`);

export const toDateISO = (date: Date): string =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

export const fromDateISO = (iso: string): Date => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const isSameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

export const todayISO = (): string => toDateISO(new Date());

export const daysInMonth = (year: number, month: number): number =>
  new Date(year, month + 1, 0).getDate();

/**
 * Returns 0..6 where Monday = 0, Sunday = 6 (so the week starts on Monday).
 */
export const weekdayMondayFirst = (date: Date): number => {
  const sundayFirst = date.getDay(); // 0..6 (Sun..Sat)
  return (sundayFirst + 6) % 7;
};

export const formatMonthYear = (year: number, month: number): string =>
  `${MONTH_NAMES[month]} ${year}`;

export const formatPrettyDate = (iso: string): string => {
  const d = fromDateISO(iso);
  return `${WEEKDAY_LABELS_SHORT[weekdayMondayFirst(d)]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};
