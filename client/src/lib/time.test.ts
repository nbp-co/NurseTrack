import { describe, it, expect } from '@jest/globals';
import { toUtcFromLocal, toLocalDisplay, isOvernight, overlaps } from './time';

describe('Time Utilities', () => {
  describe('toUtcFromLocal', () => {
    it('should convert standard day time correctly', () => {
      // Convert 2024-07-15 10:30 AM Chicago time to UTC
      const result = toUtcFromLocal('2024-07-15', '10:30', 'America/Chicago');
      
      // Chicago is UTC-5 during summer (CDT), so 10:30 AM becomes 3:30 PM UTC
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(6); // July (0-indexed)
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(15);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it('should handle winter time correctly', () => {
      // Convert 2024-01-15 10:30 AM Chicago time to UTC
      const result = toUtcFromLocal('2024-01-15', '10:30', 'America/Chicago');
      
      // Chicago is UTC-6 during winter (CST), so 10:30 AM becomes 4:30 PM UTC
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(0); // January (0-indexed)
      expect(result.getUTCDate()).toBe(15);
      expect(result.getUTCHours()).toBe(16);
      expect(result.getUTCMinutes()).toBe(30);
    });

    it('should handle DST start day (spring forward) - preserves local time', () => {
      // DST starts March 10, 2024 at 2:00 AM (jumps to 3:00 AM)
      // Test a shift at 7:00 AM on DST start day
      const result = toUtcFromLocal('2024-03-10', '07:00', 'America/Chicago');
      
      // 7:00 AM CDT = 12:00 PM UTC (spring forward already happened)
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(2); // March (0-indexed)
      expect(result.getUTCDate()).toBe(10);
      expect(result.getUTCHours()).toBe(12);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it('should handle DST end day (fall back) - preserves local time', () => {
      // DST ends November 3, 2024 at 2:00 AM (jumps back to 1:00 AM)
      // Test a shift at 7:00 AM on DST end day
      const result = toUtcFromLocal('2024-11-03', '07:00', 'America/Chicago');
      
      // 7:00 AM CST = 1:00 PM UTC (fall back already happened)
      expect(result.getUTCFullYear()).toBe(2024);
      expect(result.getUTCMonth()).toBe(10); // November (0-indexed)
      expect(result.getUTCDate()).toBe(3);
      expect(result.getUTCHours()).toBe(13);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it('should handle midnight correctly', () => {
      const result = toUtcFromLocal('2024-07-15', '00:00', 'America/Chicago');
      
      // Midnight CDT = 5:00 AM UTC
      expect(result.getUTCHours()).toBe(5);
      expect(result.getUTCMinutes()).toBe(0);
    });

    it('should handle different timezone', () => {
      // Test with New York timezone
      const result = toUtcFromLocal('2024-07-15', '10:30', 'America/New_York');
      
      // NYC is UTC-4 during summer (EDT), so 10:30 AM becomes 2:30 PM UTC
      expect(result.getUTCHours()).toBe(14);
      expect(result.getUTCMinutes()).toBe(30);
    });
  });

  describe('toLocalDisplay', () => {
    it('should convert UTC to local display format correctly', () => {
      // Create a UTC date: July 15, 2024 3:30 PM UTC
      const utcDate = new Date('2024-07-15T15:30:00.000Z');
      const result = toLocalDisplay(utcDate, 'America/Chicago');
      
      // 3:30 PM UTC = 10:30 AM CDT (UTC-5)
      expect(result.date).toBe('2024-07-15');
      expect(result.time).toBe('10:30 AM');
    });

    it('should handle ISO string input', () => {
      const result = toLocalDisplay('2024-07-15T15:30:00.000Z', 'America/Chicago');
      
      expect(result.date).toBe('2024-07-15');
      expect(result.time).toBe('10:30 AM');
    });

    it('should handle date crossing midnight in local time', () => {
      // 2:00 AM UTC on July 16 = 9:00 PM CDT on July 15
      const utcDate = new Date('2024-07-16T02:00:00.000Z');
      const result = toLocalDisplay(utcDate, 'America/Chicago');
      
      expect(result.date).toBe('2024-07-15');
      expect(result.time).toBe('9:00 PM');
    });

    it('should handle different timezones', () => {
      const utcDate = new Date('2024-07-15T15:30:00.000Z');
      const resultNY = toLocalDisplay(utcDate, 'America/New_York');
      
      // 3:30 PM UTC = 11:30 AM EDT (UTC-4)
      expect(resultNY.date).toBe('2024-07-15');
      expect(resultNY.time).toBe('11:30 AM');
    });

    it('should format times correctly for PM hours', () => {
      // 8:00 PM UTC = 3:00 PM CDT
      const utcDate = new Date('2024-07-15T20:00:00.000Z');
      const result = toLocalDisplay(utcDate, 'America/Chicago');
      
      expect(result.time).toBe('3:00 PM');
    });

    it('should handle DST transitions in display', () => {
      // Test during DST period
      const summerUtc = new Date('2024-07-15T15:30:00.000Z');
      const summerResult = toLocalDisplay(summerUtc, 'America/Chicago');
      expect(summerResult.time).toBe('10:30 AM'); // CDT (UTC-5)
      
      // Test during standard time period
      const winterUtc = new Date('2024-01-15T15:30:00.000Z');
      const winterResult = toLocalDisplay(winterUtc, 'America/Chicago');
      expect(winterResult.time).toBe('9:30 AM'); // CST (UTC-6)
    });
  });

  describe('isOvernight', () => {
    it('should return false for normal day shifts', () => {
      expect(isOvernight('07:00', '15:00')).toBe(false);
      expect(isOvernight('09:30', '17:30')).toBe(false);
      expect(isOvernight('00:00', '08:00')).toBe(false);
      expect(isOvernight('23:00', '23:59')).toBe(false);
    });

    it('should return true when end time is before start time', () => {
      expect(isOvernight('23:00', '07:00')).toBe(true);
      expect(isOvernight('22:30', '06:30')).toBe(true);
      expect(isOvernight('20:00', '04:00')).toBe(true);
    });

    it('should handle edge cases around midnight', () => {
      expect(isOvernight('23:59', '00:01')).toBe(true);
      expect(isOvernight('00:00', '00:00')).toBe(false);
      expect(isOvernight('12:00', '11:59')).toBe(true);
    });

    it('should handle same times', () => {
      expect(isOvernight('10:00', '10:00')).toBe(false);
      expect(isOvernight('00:00', '00:00')).toBe(false);
      expect(isOvernight('23:59', '23:59')).toBe(false);
    });

    it('should handle minutes correctly', () => {
      expect(isOvernight('10:30', '10:29')).toBe(true);
      expect(isOvernight('10:29', '10:30')).toBe(false);
      expect(isOvernight('23:30', '00:30')).toBe(true);
    });
  });

  describe('overlaps', () => {
    describe('overlapping cases', () => {
      it('should detect partial overlap - first starts before second', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = new Date('2024-07-15T12:00:00.000Z');
        const bStart = new Date('2024-07-15T11:00:00.000Z');
        const bEnd = new Date('2024-07-15T14:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(true);
      });

      it('should detect partial overlap - second starts before first', () => {
        const aStart = new Date('2024-07-15T11:00:00.000Z');
        const aEnd = new Date('2024-07-15T14:00:00.000Z');
        const bStart = new Date('2024-07-15T09:00:00.000Z');
        const bEnd = new Date('2024-07-15T12:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(true);
      });

      it('should detect complete containment - first contains second', () => {
        const aStart = new Date('2024-07-15T08:00:00.000Z');
        const aEnd = new Date('2024-07-15T16:00:00.000Z');
        const bStart = new Date('2024-07-15T10:00:00.000Z');
        const bEnd = new Date('2024-07-15T14:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(true);
      });

      it('should detect complete containment - second contains first', () => {
        const aStart = new Date('2024-07-15T10:00:00.000Z');
        const aEnd = new Date('2024-07-15T14:00:00.000Z');
        const bStart = new Date('2024-07-15T08:00:00.000Z');
        const bEnd = new Date('2024-07-15T16:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(true);
      });

      it('should detect exact overlap - same times', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = new Date('2024-07-15T17:00:00.000Z');
        const bStart = new Date('2024-07-15T09:00:00.000Z');
        const bEnd = new Date('2024-07-15T17:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
      });

      it('should handle ISO string inputs for overlapping ranges', () => {
        const aStart = '2024-07-15T09:00:00.000Z';
        const aEnd = '2024-07-15T12:00:00.000Z';
        const bStart = '2024-07-15T11:00:00.000Z';
        const bEnd = '2024-07-15T14:00:00.000Z';
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
      });
    });

    describe('touching cases (no overlap)', () => {
      it('should not detect overlap when ranges touch at endpoints - first ends when second starts', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = new Date('2024-07-15T12:00:00.000Z');
        const bStart = new Date('2024-07-15T12:00:00.000Z'); // Exactly when first ends
        const bEnd = new Date('2024-07-15T15:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(false);
      });

      it('should not detect overlap when ranges touch at endpoints - second ends when first starts', () => {
        const aStart = new Date('2024-07-15T12:00:00.000Z');
        const aEnd = new Date('2024-07-15T15:00:00.000Z');
        const bStart = new Date('2024-07-15T09:00:00.000Z');
        const bEnd = new Date('2024-07-15T12:00:00.000Z'); // Exactly when first starts
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(false);
      });

      it('should handle ISO string inputs for touching ranges', () => {
        const aStart = '2024-07-15T09:00:00.000Z';
        const aEnd = '2024-07-15T12:00:00.000Z';
        const bStart = '2024-07-15T12:00:00.000Z';
        const bEnd = '2024-07-15T15:00:00.000Z';
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
      });
    });

    describe('non-overlapping cases', () => {
      it('should not detect overlap when ranges are completely separate - first before second', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = new Date('2024-07-15T11:00:00.000Z');
        const bStart = new Date('2024-07-15T13:00:00.000Z');
        const bEnd = new Date('2024-07-15T15:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(false);
      });

      it('should not detect overlap when ranges are completely separate - second before first', () => {
        const aStart = new Date('2024-07-15T13:00:00.000Z');
        const aEnd = new Date('2024-07-15T15:00:00.000Z');
        const bStart = new Date('2024-07-15T09:00:00.000Z');
        const bEnd = new Date('2024-07-15T11:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
        expect(overlaps(bStart, bEnd, aStart, aEnd)).toBe(false);
      });

      it('should not detect overlap across different days', () => {
        const aStart = new Date('2024-07-15T20:00:00.000Z');
        const aEnd = new Date('2024-07-15T23:59:00.000Z');
        const bStart = new Date('2024-07-16T00:01:00.000Z');
        const bEnd = new Date('2024-07-16T08:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
      });

      it('should handle mixed Date and ISO string inputs for non-overlapping ranges', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = '2024-07-15T11:00:00.000Z';
        const bStart = '2024-07-15T13:00:00.000Z';
        const bEnd = new Date('2024-07-15T15:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false);
      });
    });

    describe('edge cases', () => {
      it('should handle identical start and end times (zero duration)', () => {
        const aStart = new Date('2024-07-15T12:00:00.000Z');
        const aEnd = new Date('2024-07-15T12:00:00.000Z');
        const bStart = new Date('2024-07-15T12:00:00.000Z');
        const bEnd = new Date('2024-07-15T15:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(false); // Zero duration, no actual overlap
      });

      it('should handle millisecond precision differences', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = new Date('2024-07-15T12:00:00.000Z');
        const bStart = new Date('2024-07-15T11:59:59.999Z'); // 1ms before aEnd
        const bEnd = new Date('2024-07-15T15:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
      });

      it('should handle very small overlaps', () => {
        const aStart = new Date('2024-07-15T09:00:00.000Z');
        const aEnd = new Date('2024-07-15T12:00:00.001Z'); // 1ms after noon
        const bStart = new Date('2024-07-15T12:00:00.000Z'); // Exactly noon
        const bEnd = new Date('2024-07-15T15:00:00.000Z');
        
        expect(overlaps(aStart, aEnd, bStart, bEnd)).toBe(true);
      });

      it('should handle overnight shifts with proper UTC conversion', () => {
        // Simulate two overnight shifts that might overlap
        const shift1Start = new Date('2024-07-15T22:00:00.000Z'); // 22:00 UTC
        const shift1End = new Date('2024-07-16T06:00:00.000Z');   // 06:00 UTC next day
        const shift2Start = new Date('2024-07-16T04:00:00.000Z'); // 04:00 UTC next day  
        const shift2End = new Date('2024-07-16T12:00:00.000Z');   // 12:00 UTC next day
        
        expect(overlaps(shift1Start, shift1End, shift2Start, shift2End)).toBe(true);
      });
    });
  });

  describe('Integration tests', () => {
    it('should handle complete round-trip conversion', () => {
      const originalDate = '2024-07-15';
      const originalTime = '10:30';
      const timezone = 'America/Chicago';
      
      // Convert to UTC and back
      const utcDate = toUtcFromLocal(originalDate, originalTime, timezone);
      const displayResult = toLocalDisplay(utcDate, timezone);
      
      expect(displayResult.date).toBe(originalDate);
      expect(displayResult.time).toBe('10:30 AM');
    });

    it('should preserve local times across DST boundaries', () => {
      const timezone = 'America/Chicago';
      
      // Test same local time on different DST periods
      const winterUtc = toUtcFromLocal('2024-01-15', '10:30', timezone);
      const summerUtc = toUtcFromLocal('2024-07-15', '10:30', timezone);
      
      const winterDisplay = toLocalDisplay(winterUtc, timezone);
      const summerDisplay = toLocalDisplay(summerUtc, timezone);
      
      // Both should display the same local time despite different UTC offsets
      expect(winterDisplay.time).toBe('10:30 AM');
      expect(summerDisplay.time).toBe('10:30 AM');
      
      // But the UTC times should be different (1 hour apart)
      const utcDiffHours = (summerUtc.getTime() - winterUtc.getTime()) / (1000 * 60 * 60);
      expect(Math.abs(utcDiffHours)).toBeCloseTo(1, 0); // Should be about 1 hour difference due to DST
    });
  });
});