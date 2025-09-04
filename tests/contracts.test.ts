import { describe, it, expect, beforeEach } from '@jest/globals';
import { DateTime } from 'luxon';
import * as contractsService from '../server/services/contracts';
import type { Contract, ContractScheduleDay } from '../shared/schema';

describe('Contracts Service - Unit Tests', () => {
  describe('validateSchedule', () => {
    const validSchedule = {
      defaultStart: '07:00',
      defaultEnd: '19:00',
      days: {
        '1': { enabled: true, start: '07:00', end: '19:00' },
        '2': { enabled: true, start: '07:00', end: '19:00' },
        '3': { enabled: true, start: '07:00', end: '19:00' },
        '0': { enabled: false },
        '4': { enabled: false },
        '5': { enabled: false },
        '6': { enabled: false },
      },
    };

    it('should pass validation with at least one enabled day when seedShifts is true', () => {
      const errors = contractsService.validateSchedule(validSchedule, true);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with no enabled days when seedShifts is true', () => {
      const noEnabledSchedule = {
        ...validSchedule,
        days: {
          '0': { enabled: false },
          '1': { enabled: false },
          '2': { enabled: false },
          '3': { enabled: false },
          '4': { enabled: false },
          '5': { enabled: false },
          '6': { enabled: false },
        },
      };
      const errors = contractsService.validateSchedule(noEnabledSchedule, true);
      expect(errors).toContain('At least one weekday must be enabled when seedShifts is true');
    });

    it('should pass validation with no enabled days when seedShifts is false', () => {
      const noEnabledSchedule = {
        ...validSchedule,
        days: {
          '0': { enabled: false },
          '1': { enabled: false },
          '2': { enabled: false },
          '3': { enabled: false },
          '4': { enabled: false },
          '5': { enabled: false },
          '6': { enabled: false },
        },
      };
      const errors = contractsService.validateSchedule(noEnabledSchedule, false);
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid time formats', () => {
      const invalidTimeSchedule = {
        defaultStart: '25:00', // Invalid hour
        defaultEnd: '19:60',   // Invalid minute
        days: {
          '1': { enabled: true, start: 'abc', end: '19:00' },
        },
      };
      const errors = contractsService.validateSchedule(invalidTimeSchedule, true);
      expect(errors.length).toBeGreaterThan(0);
      expect(errors.some(e => e.includes('defaultStart'))).toBeTruthy();
      expect(errors.some(e => e.includes('defaultEnd'))).toBeTruthy();
      expect(errors.some(e => e.includes('Day 1 start time'))).toBeTruthy();
    });
  });

  describe('validateDateRange', () => {
    it('should pass validation with valid date range', () => {
      const errors = contractsService.validateDateRange('2024-01-01', '2024-01-31');
      expect(errors).toHaveLength(0);
    });

    it('should fail validation when endDate is before startDate', () => {
      const errors = contractsService.validateDateRange('2024-01-31', '2024-01-01');
      expect(errors).toContain('endDate must be greater than or equal to startDate');
    });

    it('should pass validation when endDate equals startDate', () => {
      const errors = contractsService.validateDateRange('2024-01-01', '2024-01-01');
      expect(errors).toHaveLength(0);
    });

    it('should fail validation with invalid date formats', () => {
      const errors = contractsService.validateDateRange('invalid-date', '2024-01-01');
      expect(errors.some(e => e.includes('startDate must be a valid ISO date'))).toBeTruthy();
    });
  });

  describe('getEffectiveShiftTime', () => {
    const schedule = {
      defaultStart: '07:00',
      defaultEnd: '19:00',
      days: {
        '1': { enabled: true, start: '08:00', end: '20:00' }, // Monday override
        '2': { enabled: true }, // Tuesday uses defaults
      },
    };

    it('should return day-specific time when available', () => {
      const startTime = contractsService.getEffectiveShiftTime(1, schedule, true);
      expect(startTime).toBe('08:00');
      
      const endTime = contractsService.getEffectiveShiftTime(1, schedule, false);
      expect(endTime).toBe('20:00');
    });

    it('should return default time when no day-specific override', () => {
      const startTime = contractsService.getEffectiveShiftTime(2, schedule, true);
      expect(startTime).toBe('07:00');
      
      const endTime = contractsService.getEffectiveShiftTime(2, schedule, false);
      expect(endTime).toBe('19:00');
    });
  });

  describe('convertLocalToUtc', () => {
    it('should convert local time to UTC correctly', () => {
      const utc = contractsService.convertLocalToUtc('2024-03-15', '10:00', 'America/New_York');
      // March 15, 2024 was during EDT (UTC-4)
      expect(utc.toISO()).toBe('2024-03-15T14:00:00.000Z');
    });

    it('should handle DST transition correctly', () => {
      // March 10, 2024 was the DST transition in 2024 (EST to EDT)
      const winterUtc = contractsService.convertLocalToUtc('2024-01-15', '10:00', 'America/New_York');
      const summerUtc = contractsService.convertLocalToUtc('2024-07-15', '10:00', 'America/New_York');
      
      // January: EST (UTC-5), July: EDT (UTC-4)
      expect(winterUtc.toISO()).toBe('2024-01-15T15:00:00.000Z');
      expect(summerUtc.toISO()).toBe('2024-07-15T14:00:00.000Z');
    });
  });

  describe('generateShiftDates', () => {
    const schedule = {
      defaultStart: '07:00',
      defaultEnd: '19:00',
      days: {
        '1': { enabled: true }, // Monday
        '3': { enabled: true }, // Wednesday  
        '5': { enabled: true }, // Friday
        '0': { enabled: false },
        '2': { enabled: false },
        '4': { enabled: false },
        '6': { enabled: false },
      },
    };

    it('should generate shifts for enabled weekdays only', () => {
      // Week starting Monday Jan 1, 2024
      const shifts = contractsService.generateShiftDates(
        '2024-01-01', // Monday
        '2024-01-07', // Sunday
        'America/Chicago',
        schedule
      );

      expect(shifts).toHaveLength(3); // Mon, Wed, Fri
      expect(shifts[0].localDate).toBe('2024-01-01'); // Monday
      expect(shifts[1].localDate).toBe('2024-01-03'); // Wednesday
      expect(shifts[2].localDate).toBe('2024-01-05'); // Friday
    });

    it('should handle overnight shifts correctly', () => {
      const overnightSchedule = {
        defaultStart: '19:00',
        defaultEnd: '07:00', // Next day
        days: {
          '1': { enabled: true }, // Monday
          '0': { enabled: false },
          '2': { enabled: false },
          '3': { enabled: false },
          '4': { enabled: false },
          '5': { enabled: false },
          '6': { enabled: false },
        },
      };

      const shifts = contractsService.generateShiftDates(
        '2024-01-01', // Monday
        '2024-01-01', // Same day
        'America/Chicago',
        overnightSchedule
      );

      expect(shifts).toHaveLength(1);
      const shift = shifts[0];
      
      // Start should be Monday 7PM
      expect(shift.startUtc.toJSDate().getUTCHours()).toBe(1); // 19:00 CST = 01:00 UTC next day
      // End should be Tuesday 7AM 
      expect(shift.endUtc.toJSDate().getUTCHours()).toBe(13); // 07:00 CST = 13:00 UTC same day
      
      // End should be after start
      expect(shift.endUtc > shift.startUtc).toBeTruthy();
    });

    it('should handle single day range', () => {
      const shifts = contractsService.generateShiftDates(
        '2024-01-01', // Monday
        '2024-01-01', // Same Monday
        'America/Chicago',
        schedule
      );

      expect(shifts).toHaveLength(1);
      expect(shifts[0].localDate).toBe('2024-01-01');
    });
  });

  describe('computeSeedActions', () => {
    const oldContract: Contract = {
      id: 1,
      name: 'Test Contract',
      facility: 'Test Facility',
      role: 'Test Role',
      startDate: '2024-01-01',
      endDate: '2024-01-31',
      baseRate: '50.00',
      otRate: '75.00',
      hoursPerWeek: '36.00',
      status: 'planned',
      timezone: 'America/Chicago',
      createdAt: new Date(),
    };

    const oldSchedule: ContractScheduleDay[] = [
      { id: 1, contractId: 1, weekday: 1, enabled: true, startLocal: '07:00', endLocal: '19:00' },
      { id: 2, contractId: 1, weekday: 3, enabled: true, startLocal: '07:00', endLocal: '19:00' },
      { id: 3, contractId: 1, weekday: 5, enabled: true, startLocal: '07:00', endLocal: '19:00' },
      { id: 4, contractId: 1, weekday: 0, enabled: false, startLocal: '07:00', endLocal: '19:00' },
      { id: 5, contractId: 1, weekday: 2, enabled: false, startLocal: '07:00', endLocal: '19:00' },
      { id: 6, contractId: 1, weekday: 4, enabled: false, startLocal: '07:00', endLocal: '19:00' },
      { id: 7, contractId: 1, weekday: 6, enabled: false, startLocal: '07:00', endLocal: '19:00' },
    ];

    it('should detect range expansion correctly', () => {
      const newContract = { startDate: '2023-12-15', endDate: '2024-02-15' };
      const newSchedule = {
        defaultStart: '07:00',
        defaultEnd: '19:00',
        days: {
          '1': { enabled: true },
          '3': { enabled: true },
          '5': { enabled: true },
          '0': { enabled: false },
          '2': { enabled: false },
          '4': { enabled: false },
          '6': { enabled: false },
        },
      };

      const actions = contractsService.computeSeedActions(
        oldContract,
        oldSchedule,
        newContract,
        newSchedule
      );

      expect(actions.addDates.length).toBeGreaterThan(0);
      // Should include dates before Jan 1 and after Jan 31
      expect(actions.addDates.some(date => date < '2024-01-01')).toBeTruthy();
      expect(actions.addDates.some(date => date > '2024-01-31')).toBeTruthy();
    });

    it('should detect range narrowing correctly', () => {
      const newContract = { startDate: '2024-01-15', endDate: '2024-01-20' };
      const newSchedule = {
        defaultStart: '07:00',
        defaultEnd: '19:00',
        days: {
          '1': { enabled: true },
          '3': { enabled: true },
          '5': { enabled: true },
          '0': { enabled: false },
          '2': { enabled: false },
          '4': { enabled: false },
          '6': { enabled: false },
        },
      };

      const actions = contractsService.computeSeedActions(
        oldContract,
        oldSchedule,
        newContract,
        newSchedule
      );

      expect(actions.removeDates.length).toBeGreaterThan(0);
      // Should include dates before Jan 15 and after Jan 20
      expect(actions.removeDates.some(date => date < '2024-01-15')).toBeTruthy();
      expect(actions.removeDates.some(date => date > '2024-01-20')).toBeTruthy();
    });

    it('should detect weekday enable/disable changes', () => {
      const newContract = {}; // No date changes
      const newSchedule = {
        defaultStart: '07:00',
        defaultEnd: '19:00',
        days: {
          '1': { enabled: true },  // Monday - still enabled
          '3': { enabled: false }, // Wednesday - disabled
          '5': { enabled: true },  // Friday - still enabled
          '2': { enabled: true },  // Tuesday - newly enabled
          '0': { enabled: false },
          '4': { enabled: false },
          '6': { enabled: false },
        },
      };

      const actions = contractsService.computeSeedActions(
        oldContract,
        oldSchedule,
        newContract,
        newSchedule
      );

      // Should have Tuesdays to add and Wednesdays to remove
      expect(actions.addDates.length).toBeGreaterThan(0);
      expect(actions.removeDates.length).toBeGreaterThan(0);
      
      // Check some Tuesdays are added (weekday 2)
      const tuesdaysAdded = actions.addDates.filter(date => {
        const day = DateTime.fromISO(date);
        return day.weekday === 2; // Tuesday in Luxon (1=Monday)
      });
      expect(tuesdaysAdded.length).toBeGreaterThan(0);
    });

    it('should detect time changes', () => {
      const newContract = {}; // No date changes
      const newSchedule = {
        defaultStart: '08:00', // Changed from 07:00
        defaultEnd: '20:00',   // Changed from 19:00
        days: {
          '1': { enabled: true },
          '3': { enabled: true },
          '5': { enabled: true },
          '0': { enabled: false },
          '2': { enabled: false },
          '4': { enabled: false },
          '6': { enabled: false },
        },
      };

      const actions = contractsService.computeSeedActions(
        oldContract,
        oldSchedule,
        newContract,
        newSchedule
      );

      expect(actions.updateDates.length).toBeGreaterThan(0);
      // Should update all enabled days (Mon, Wed, Fri) for the entire range
      const mondaysUpdated = actions.updateDates.filter(date => {
        const day = DateTime.fromISO(date);
        return day.weekday === 1; // Monday
      });
      expect(mondaysUpdated.length).toBeGreaterThan(0);
    });
  });
});