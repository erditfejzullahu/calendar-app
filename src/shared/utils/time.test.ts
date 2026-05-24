import {
  currentHHmm,
  formatTimeRange,
  hhmmToMinutes,
  isValidHHmm,
  isoAndHHmmToTimestamp,
  minutesToHHmm,
} from './time';

describe('HH:mm primitives', () => {
  it('validates padded 24h clock strings only', () => {
    expect(isValidHHmm('09:05')).toBe(true);
    expect(isValidHHmm('9:05')).toBe(false);
    expect(isValidHHmm('24:00')).toBe(false);
  });

  it('converts to minutes and back', () => {
    expect(hhmmToMinutes('01:05')).toBe(65);
    expect(minutesToHHmm(65)).toBe('01:05');
    expect(minutesToHHmm(23 * 60 + 59)).toBe('23:59');
  });

  it('combines iso date parts with HH:mm into a wall-clock timestamp', () => {
    const ts = isoAndHHmmToTimestamp('2026-03-02', '14:30');
    expect(new Date(ts).getFullYear()).toBe(2026);
    expect(new Date(ts).getHours()).toBe(14);
    expect(new Date(ts).getMinutes()).toBe(30);
  });

  it('formats a readable time range helper', () => {
    expect(formatTimeRange('10:00', '11:30')).toBe('10:00 – 11:30');
  });

  it('returns padded current clock string', () => {
    const value = currentHHmm();
    expect(/^[0-2]\d:[0-5]\d$/.test(value)).toBe(true);
  });
});
