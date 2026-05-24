import {buildMeeting} from '@testing/factories/meeting.factory';
import {findOverlappingMeeting, intervalsOverlap} from './overlap';

describe('intervalsOverlap (half-open [start, end))', () => {
  it('detects touch-point adjacency as non-overlap', () => {
    expect(intervalsOverlap(60, 120, 120, 180)).toBe(false);
  });

  it('detects partial overlap', () => {
    expect(intervalsOverlap(60, 150, 120, 180)).toBe(true);
  });

  it('detects nested intervals', () => {
    expect(intervalsOverlap(90, 150, 60, 180)).toBe(true);
  });
});

describe('findOverlappingMeeting', () => {
  const day = [
    buildMeeting({id: 'a', startTime: '09:00', endTime: '10:00', title: 'A'}),
    buildMeeting({id: 'b', startTime: '12:00', endTime: '13:00', title: 'B'}),
  ];

  it('returns undefined when the window is free', () => {
    expect(findOverlappingMeeting(day, '10:30', '11:30')).toBeUndefined();
  });

  it('returns the first conflicting meeting', () => {
    const clash = findOverlappingMeeting(day, '09:30', '10:30');
    expect(clash?.id).toBe('a');
  });

  it('ignores the meeting being edited', () => {
    const clash = findOverlappingMeeting(day, '09:00', '10:00', 'a');
    expect(clash).toBeUndefined();
  });
});
