import { DateTime } from 'luxon';
import type { Contract, Shift } from '@shared/schema';

/**
 * Calculate duration in decimal hours for a shift
 * Handles overnight shifts by adding 24 hours if end_time < start_time
 */
export function durationHours(shift_date: string, start_time: string, end_time: string): number {
  const [startHour, startMin] = start_time.split(':').map(Number);
  const [endHour, endMin] = end_time.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60; // Add 24 hours worth of minutes
  }
  
  const durationMinutes = endMinutes - startMinutes;
  return durationMinutes / 60; // Convert to decimal hours
}

/**
 * Combine date and time into UTC timestamp using contract timezone
 */
export function combineDateTime(shift_date: string, start_time: string, timezone: string = 'America/Chicago'): DateTime {
  const [hours, minutes] = start_time.split(':').map(Number);
  
  // Create date in the contract's timezone
  const localDateTime = DateTime.fromObject(
    {
      year: parseInt(shift_date.split('-')[0]),
      month: parseInt(shift_date.split('-')[1]),
      day: parseInt(shift_date.split('-')[2]),
      hour: hours,
      minute: minutes
    },
    { zone: timezone }
  );
  
  return localDateTime.toUTC();
}

/**
 * Calculate weekly earnings for a contract
 * First 40 hours = base_rate, excess hours = ot_rate (if set, else base_rate)
 */
export function weeklyEarningsForContract(
  contract: Contract,
  weekStart: string,
  weekEnd: string,
  shifts: Shift[]
): { hours: number; earnings: number } {
  // Filter shifts for this contract and week
  const contractShifts = shifts.filter(shift => 
    shift.contractId === contract.id &&
    shift.shiftDate >= weekStart &&
    shift.shiftDate <= weekEnd
  );
  
  // Calculate total hours using the time fields directly
  const totalHours = contractShifts.reduce((sum, shift) => {
    return sum + durationHours(shift.shiftDate, shift.startTime, shift.endTime);
  }, 0);
  
  // Calculate earnings with 40-hour base/OT split
  let earnings = 0;
  const baseHours = Math.min(totalHours, 40);
  const otHours = Math.max(totalHours - 40, 0);
  
  earnings += baseHours * Number(contract.baseRate);
  if (otHours > 0) {
    const otRate = Number(contract.otRate) || Number(contract.baseRate);
    earnings += otHours * otRate;
  }
  
  return { hours: totalHours, earnings };
}

/**
 * Calculate monthly earnings for a contract by summing weekly earnings
 */
export function monthlyEarningsForContract(
  contract: Contract,
  monthStart: string,
  monthEnd: string,
  shifts: Shift[]
): { hours: number; earnings: number } {
  let totalHours = 0;
  let totalEarnings = 0;
  
  // Iterate through weeks that overlap with the month
  const startDate = DateTime.fromISO(monthStart);
  const endDate = DateTime.fromISO(monthEnd);
  
  // Find first Sunday on or before month start
  let currentWeekStart = startDate.startOf('week'); // Luxon weeks start on Monday by default
  currentWeekStart = currentWeekStart.minus({ days: 1 }); // Adjust to start on Sunday
  
  while (currentWeekStart <= endDate) {
    const weekEnd = currentWeekStart.plus({ days: 6 });
    
    // Only process weeks that overlap with our month
    if (weekEnd >= startDate) {
      const weekStartStr = currentWeekStart.toISODate()!;
      const weekEndStr = weekEnd.toISODate()!;
      
      const weekResult = weeklyEarningsForContract(contract, weekStartStr, weekEndStr, shifts);
      totalHours += weekResult.hours;
      totalEarnings += weekResult.earnings;
    }
    
    currentWeekStart = currentWeekStart.plus({ days: 7 });
  }
  
  return { hours: totalHours, earnings: totalEarnings };
}

/**
 * Get week boundaries for a given date (Sunday to Saturday)
 */
export function getWeekBoundaries(anchorDate: string): { weekStart: string; weekEnd: string } {
  const date = DateTime.fromISO(anchorDate);
  
  // Find Sunday of this week
  let weekStart = date.startOf('week'); // Monday
  weekStart = weekStart.minus({ days: 1 }); // Sunday
  
  const weekEnd = weekStart.plus({ days: 6 }); // Saturday
  
  return {
    weekStart: weekStart.toISODate()!,
    weekEnd: weekEnd.toISODate()!
  };
}

/**
 * Get month boundaries for a given date
 */
export function getMonthBoundaries(anchorDate: string): { monthStart: string; monthEnd: string } {
  const date = DateTime.fromISO(anchorDate);
  const monthStart = date.startOf('month');
  const monthEnd = date.endOf('month');
  
  return {
    monthStart: monthStart.toISODate()!,
    monthEnd: monthEnd.toISODate()!
  };
}