/**
 * Time helpers — everything is "HH:mm" strings + minute counters.
 * Decouples UI from any specific Date object so the calendar feature
 * remains framework-agnostic.
 */

const HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const isValidHHmm = (value: string): boolean => HHMM.test(value);

export const hhmmToMinutes = (value: string): number => {
  const [h, m] = value.split(':').map(Number);
  return h * 60 + m;
};

export const minutesToHHmm = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
};

const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);

/**
 * Combine an ISO date (YYYY-MM-DD) and a HH:mm string into a JS timestamp.
 */
export const isoAndHHmmToTimestamp = (dateISO: string, hhmm: string): number => {
  const [y, mo, d] = dateISO.split('-').map(Number);
  const [h, mi] = hhmm.split(':').map(Number);
  return new Date(y, mo - 1, d, h, mi, 0, 0).getTime();
};

export const formatTimeRange = (start: string, end: string): string => `${start} – ${end}`;

export const currentHHmm = (): string => {
  const d = new Date();
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};
