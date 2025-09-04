import { describe, it, expect } from '@jest/globals';
import {
  parseHHmm,
  minutesBetweenLocal,
  hoursFromMinutes,
  weekStartSunday,
  addDays,
  inRange
} from '../lib/localTime';

describe('Local Time Utilities', () => {
  describe('parseHHmm', () => {
    it('parses valid time strings', () => {
      expect(parseHHmm('07:30')).toEqual({ h: 7, m: 30 });
      expect(parseHHmm('19:00')).toEqual({ h: 19, m: 0 });
      expect(parseHHmm('00:00')).toEqual({ h: 0, m: 0 });
    });
  });

  describe('minutesBetweenLocal', () => {
    it('calculates standard shift duration', () => {
      expect(minutesBetweenLocal('07:00', '19:00')).toBe(720); // 12 hours
    });

    it('handles overnight shifts correctly', () => {
      expect(minutesBetweenLocal('19:00', '07:00')).toBe(720); // 12 hours overnight
    });

    it('handles partial hours', () => {
      expect(minutesBetweenLocal('08:30', '17:15')).toBe(525); // 8h 45m = 525 min
    });

    it('handles edge cases', () => {
      expect(minutesBetweenLocal('23:30', '00:30')).toBe(60); // 1 hour overnight
    });
  });

  describe('hoursFromMinutes', () => {
    it('converts minutes to decimal hours', () => {
      expect(hoursFromMinutes(720)).toBe(12.0);
      expect(hoursFromMinutes(525)).toBe(8.75);
      expect(hoursFromMinutes(90)).toBe(1.5);
    });
  });

  describe('weekStartSunday', () => {
    it('returns Sunday for Monday', () => {
      // Sept 2, 2025 is a Tuesday
      expect(weekStartSunday('2025-09-02')).toBe('2025-08-31'); // Previous Sunday
    });

    it('returns same date for Sunday', () => {
      // Aug 31, 2025 is a Sunday
      expect(weekStartSunday('2025-08-31')).toBe('2025-08-31');
    });

    it('returns Sunday for Friday', () => {
      // Sept 6, 2025 is a Saturday
      expect(weekStartSunday('2025-09-06')).toBe('2025-08-31'); // Previous Sunday
    });
  });

  describe('addDays', () => {
    it('adds positive days', () => {
      expect(addDays('2025-09-01', 5)).toBe('2025-09-06');
    });

    it('handles month boundaries', () => {
      expect(addDays('2025-08-30', 2)).toBe('2025-09-01');
    });

    it('handles negative days', () => {
      expect(addDays('2025-09-05', -2)).toBe('2025-09-03');
    });
  });

  describe('inRange', () => {
    it('checks inclusive range correctly', () => {
      expect(inRange('2025-09-05', '2025-09-01', '2025-09-10')).toBe(true);
      expect(inRange('2025-09-01', '2025-09-01', '2025-09-10')).toBe(true);
      expect(inRange('2025-09-10', '2025-09-01', '2025-09-10')).toBe(true);
      expect(inRange('2025-08-31', '2025-09-01', '2025-09-10')).toBe(false);
    });
  });
});