/**
 * Payroll calculations using local naive date/time values only
 * No UTC or timezone conversions
 */

import { 
  minutesBetweenLocal, 
  hoursFromMinutes, 
  weekStartSunday, 
  addDays, 
  inRange 
} from '../../client/src/lib/localTime';

export interface ShiftRow {
  id: string | number;
  shift_date: string; // YYYY-MM-DD
  start_time: string; // HH:mm
  end_time: string; // HH:mm
  contract_id: string | null;
  status: string;
}

export interface ContractRow {
  id: string;
  base_rate: number;
  ot_rate: number | null;
}

export interface WeekSegment {
  weekStart: string;
  minutes: number;
}

/**
 * Calculate shift duration in minutes using local time only
 */
export function shiftMinutes(shift: ShiftRow): number {
  return minutesBetweenLocal(shift.start_time, shift.end_time);
}

/**
 * Split overnight shifts that cross week boundaries
 * Returns array of week segments with minutes for each
 */
export function splitShiftByLocalWeek(shift: ShiftRow): WeekSegment[] {
  const shiftDate = shift.shift_date;
  const startTime = shift.start_time;
  const endTime = shift.end_time;
  
  // Check if overnight
  const isOvernight = endTime < startTime;
  
  if (!isOvernight) {
    // Daytime shift - belongs to one week
    const weekStart = weekStartSunday(shiftDate);
    const minutes = minutesBetweenLocal(startTime, endTime);
    return [{ weekStart, minutes }];
  }
  
  // Overnight shift - check if it crosses week boundary
  const nextDate = addDays(shiftDate, 1);
  const shiftWeek = weekStartSunday(shiftDate);
  const nextWeek = weekStartSunday(nextDate);
  
  if (shiftWeek === nextWeek) {
    // Same week - doesn't cross boundary
    const weekStart = shiftWeek;
    const minutes = minutesBetweenLocal(startTime, endTime);
    return [{ weekStart, minutes }];
  }
  
  // Crosses week boundary - split into two parts
  const part1Minutes = minutesBetweenLocal(startTime, '24:00');
  const part2Minutes = minutesBetweenLocal('00:00', endTime);
  
  return [
    { weekStart: shiftWeek, minutes: part1Minutes },
    { weekStart: nextWeek, minutes: part2Minutes }
  ];
}

/**
 * Calculate weekly earnings for a specific contract
 * First 40 hours = base_rate, excess = ot_rate (or base_rate if ot_rate is null)
 */
export function weeklyEarningsForContract(
  weekStart: string,
  weekEnd: string,
  shifts: ShiftRow[],
  contract: ContractRow | null
): { hours: number; earnings: number } {
  if (!contract) {
    // For null contract, count hours but no earnings
    let totalMinutes = 0;
    
    shifts.forEach(shift => {
      if (shift.contract_id === null && ['scheduled', 'unconfirmed', 'completed', 'Planned', 'In Process', 'Finalized'].includes(shift.status)) {
        const segments = splitShiftByLocalWeek(shift);
        segments.forEach(segment => {
          if (segment.weekStart === weekStart) {
            totalMinutes += segment.minutes;
          }
        });
      }
    });
    
    return {
      hours: Math.round(hoursFromMinutes(totalMinutes) * 10) / 10,
      earnings: 0
    };
  }
  
  // Calculate hours for this contract in this week
  let totalMinutes = 0;
  
  shifts.forEach(shift => {
    if (shift.contract_id === contract.id && ['scheduled', 'unconfirmed', 'completed', 'Planned', 'In Process', 'Finalized'].includes(shift.status)) {
      const segments = splitShiftByLocalWeek(shift);
      segments.forEach(segment => {
        if (segment.weekStart === weekStart) {
          totalMinutes += segment.minutes;
        }
      });
    }
  });
  
  const totalHours = hoursFromMinutes(totalMinutes);
  
  // Apply 40-hour base/OT rule
  const baseHours = Math.min(totalHours, 40);
  const otHours = Math.max(totalHours - 40, 0);
  
  let earnings = baseHours * contract.base_rate;
  if (otHours > 0) {
    const otRate = contract.ot_rate || contract.base_rate;
    earnings += otHours * otRate;
  }
  
  return {
    hours: Math.round(totalHours * 10) / 10,
    earnings: Math.round(earnings * 100) / 100
  };
}

/**
 * Calculate period summary by iterating over weeks
 */
export function periodSummaryByContract(
  periodStart: string,
  periodEnd: string,
  allShifts: ShiftRow[],
  contractsById: Map<string, ContractRow>
): { hours: number; earnings: number } {
  let totalHours = 0;
  let totalEarnings = 0;
  
  // Find all Sundays that overlap with the period
  let currentWeekStart = weekStartSunday(periodStart);
  
  while (currentWeekStart <= addDays(periodEnd, 6)) {
    const weekEnd = addDays(currentWeekStart, 6);
    
    // Process each contract for this week
    const contractIds = new Set<string>();
    allShifts.forEach(shift => {
      if (shift.contract_id) contractIds.add(shift.contract_id);
    });
    
    // Add earnings for each contract
    contractIds.forEach(contractId => {
      const contract = contractsById.get(contractId);
      if (contract) {
        const weekResult = weeklyEarningsForContract(currentWeekStart, weekEnd, allShifts, contract);
        totalHours += weekResult.hours;
        totalEarnings += weekResult.earnings;
      }
    });
    
    // Add hours for null-contract shifts
    const nullResult = weeklyEarningsForContract(currentWeekStart, weekEnd, allShifts, null);
    totalHours += nullResult.hours;
    
    currentWeekStart = addDays(currentWeekStart, 7);
  }
  
  return {
    hours: Math.round(totalHours * 10) / 10,
    earnings: Math.round(totalEarnings * 100) / 100
  };
}