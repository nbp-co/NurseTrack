import { describe, it, expect } from '@jest/globals';
import {
  shiftMinutes,
  splitShiftByLocalWeek,
  weeklyEarningsForContract,
  type ShiftRow,
  type ContractRow
} from '../services/payrollLocal';

describe('Payroll Local Service', () => {
  const mockContract: ContractRow = {
    id: '1',
    base_rate: 45.0,
    ot_rate: 67.5
  };

  describe('shiftMinutes', () => {
    it('calculates standard shift duration', () => {
      const shift: ShiftRow = {
        id: 1,
        shift_date: '2025-09-06',
        start_time: '07:00',
        end_time: '19:00',
        contract_id: '1',
        status: 'Planned'
      };
      
      expect(shiftMinutes(shift)).toBe(720); // 12 hours
    });

    it('handles overnight shifts', () => {
      const shift: ShiftRow = {
        id: 1,
        shift_date: '2025-09-06',
        start_time: '19:00',
        end_time: '07:00',
        contract_id: '1',
        status: 'Planned'
      };
      
      expect(shiftMinutes(shift)).toBe(720); // 12 hours overnight
    });
  });

  describe('weeklyEarningsForContract', () => {
    const mockShifts: ShiftRow[] = [
      {
        id: 1,
        shift_date: '2025-09-06', // Saturday
        start_time: '07:00',
        end_time: '19:00',
        contract_id: '1',
        status: 'Planned'
      }
    ];

    it('calculates base hours correctly (under 40)', () => {
      const result = weeklyEarningsForContract(
        '2025-08-31', // Sunday
        '2025-09-06', // Saturday
        mockShifts,
        mockContract
      );
      
      expect(result.hours).toBe(12.0);
      expect(result.earnings).toBe(540.0); // 12 hours * $45
    });

    it('calculates overtime correctly (over 40 hours)', () => {
      const weekShifts: ShiftRow[] = Array(4).fill(null).map((_, i) => ({
        id: i + 1,
        shift_date: `2025-09-0${i + 3}`, // Sept 3-6 (Wed-Sat)
        start_time: '07:00',
        end_time: '19:00',
        contract_id: '1',
        status: 'Planned'
      }));
      
      const result = weeklyEarningsForContract(
        '2025-08-31',
        '2025-09-06',
        weekShifts,
        mockContract
      );
      
      expect(result.hours).toBe(48.0); // 4 shifts * 12 hours
      expect(result.earnings).toBe(2340.0); // 40 * $45 + 8 * $67.50
    });

    it('handles null contract shifts (hours counted, earnings = 0)', () => {
      const contractlessShifts: ShiftRow[] = [
        {
          id: 1,
          shift_date: '2025-09-06',
          start_time: '07:00',
          end_time: '19:00',
          contract_id: null,
          status: 'Planned'
        }
      ];

      const result = weeklyEarningsForContract(
        '2025-08-31',
        '2025-09-06',
        contractlessShifts,
        null
      );
      
      expect(result.hours).toBe(12.0);
      expect(result.earnings).toBe(0);
    });

    it('filters by status correctly', () => {
      const mixedStatusShifts: ShiftRow[] = [
        {
          id: 1,
          shift_date: '2025-09-06',
          start_time: '07:00',
          end_time: '19:00',
          contract_id: '1',
          status: 'Planned'
        },
        {
          id: 2,
          shift_date: '2025-09-05',
          start_time: '07:00',
          end_time: '19:00',
          contract_id: '1',
          status: 'Cancelled' // Should be ignored
        }
      ];

      const result = weeklyEarningsForContract(
        '2025-08-31',
        '2025-09-06',
        mixedStatusShifts,
        mockContract
      );
      
      expect(result.hours).toBe(12.0); // Only the Planned shift
      expect(result.earnings).toBe(540.0);
    });
  });
});