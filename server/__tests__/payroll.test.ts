import { describe, it, expect } from '@jest/globals';
import { durationHours, weeklyEarningsForContract, getWeekBoundaries } from '../services/payroll';
import type { Contract, Shift } from '@shared/schema';

describe('Payroll Service', () => {
  describe('durationHours', () => {
    it('calculates standard shift duration correctly', () => {
      const result = durationHours('2025-09-06', '07:00', '19:00');
      expect(result).toBe(12.0);
    });

    it('handles overnight shifts correctly', () => {
      const result = durationHours('2025-09-06', '19:00', '07:00');
      expect(result).toBe(12.0);
    });

    it('handles partial hours', () => {
      const result = durationHours('2025-09-06', '08:30', '17:15');
      expect(result).toBe(8.75);
    });
  });

  describe('weeklyEarningsForContract', () => {
    const mockContract: Contract = {
      id: 1,
      userId: 'user1',
      name: 'Test Contract',
      facility: 'Test Hospital',
      role: 'RN',
      startDate: '2025-09-01',
      endDate: '2025-12-31',
      baseRate: '45.00',
      otRate: '67.50',
      hoursPerWeek: '40.00',
      status: 'active',
      createdAt: new Date(),
    };

    const mockShifts: Shift[] = [
      {
        id: 1,
        userId: 'user1',
        contractId: 1,
        shiftDate: '2025-09-06',
        startTime: '07:00',
        endTime: '19:00',
        facility: 'Test Hospital',
        source: 'manual',
        status: 'active',
        baseRate: null,
        otRate: null,
      }
    ];

    it('calculates base hours correctly (under 40)', () => {
      const result = weeklyEarningsForContract(
        mockContract,
        '2025-09-01',
        '2025-09-07',
        mockShifts
      );
      
      expect(result.hours).toBe(12);
      expect(result.earnings).toBe(540); // 12 hours * $45
    });

    it('calculates overtime correctly (over 40 hours)', () => {
      const weekShifts: Shift[] = [
        ...Array(4).fill(null).map((_, i) => ({
          id: i + 1,
          userId: 'user1',
          contractId: 1,
          shiftDate: `2025-09-0${i + 3}`, // Sept 3-6
          startTime: '07:00',
          endTime: '19:00',
          facility: 'Test Hospital',
          source: 'manual',
          status: 'active',
          baseRate: null,
          otRate: null,
        }))
      ];
      
      const result = weeklyEarningsForContract(
        mockContract,
        '2025-09-01',
        '2025-09-07',
        weekShifts
      );
      
      expect(result.hours).toBe(48); // 4 shifts * 12 hours
      expect(result.earnings).toBe(2340); // 40 * $45 + 8 * $67.50
    });

    it('handles null contract shifts (hours counted, earnings = 0)', () => {
      const contractlessShifts: Shift[] = [
        {
          id: 1,
          userId: 'user1',
          contractId: null,
          shiftDate: '2025-09-06',
          startTime: '07:00',
          endTime: '19:00',
          facility: 'Test Hospital',
          source: 'manual',
          status: 'active',
          baseRate: null,
          otRate: null,
        }
      ];

      const result = weeklyEarningsForContract(
        mockContract,
        '2025-09-01',
        '2025-09-07',
        contractlessShifts
      );
      
      expect(result.hours).toBe(0); // Contract doesn't own this shift
      expect(result.earnings).toBe(0);
    });
  });

  describe('getWeekBoundaries', () => {
    it('returns correct Sunday to Saturday boundaries', () => {
      // Sept 6, 2025 is a Saturday
      const result = getWeekBoundaries('2025-09-06');
      expect(result.weekStart).toBe('2025-08-31'); // Previous Sunday
      expect(result.weekEnd).toBe('2025-09-06'); // Same Saturday
    });
  });
});