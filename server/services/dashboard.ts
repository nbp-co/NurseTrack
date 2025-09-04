import { DateTime } from 'luxon';
import type { Contract, Shift } from '@shared/schema';
import { storage } from '../storage';
import { 
  weeklyEarningsForContract, 
  monthlyEarningsForContract,
  getWeekBoundaries,
  getMonthBoundaries,
  combineDateTime
} from './payroll';

export interface SummaryCard {
  hours: number;
  earnings: number;
}

export interface DashboardSummary {
  thisWeek: SummaryCard;
  nextWeek: SummaryCard;
  thisMonth: SummaryCard;
}

export interface UpcomingShift {
  id: number;
  localDate: string;
  localStart: string;
  localEnd: string;
  contract?: {
    name: string;
    facility: string;
    baseRate: string;
    timezone: string;
  };
}

/**
 * Compute dashboard summary for a given anchor date
 */
export async function computeSummary(anchorDate: Date, userId: string): Promise<DashboardSummary> {
  const anchorDateStr = anchorDate.toISOString().split('T')[0];
  
  // Get date ranges
  const thisWeekBounds = getWeekBoundaries(anchorDateStr);
  const nextWeekStart = DateTime.fromISO(thisWeekBounds.weekEnd).plus({ days: 1 }).toISODate()!;
  const nextWeekBounds = getWeekBoundaries(nextWeekStart);
  const monthBounds = getMonthBoundaries(anchorDateStr);
  
  // Fetch all user data
  const [contracts, shifts] = await Promise.all([
    storage.listContracts(userId),
    storage.getAllShifts(userId)
  ]);
  
  // Calculate summary for each period
  const thisWeek = calculatePeriodSummary(contracts, shifts, thisWeekBounds.weekStart, thisWeekBounds.weekEnd, 'week');
  const nextWeek = calculatePeriodSummary(contracts, shifts, nextWeekBounds.weekStart, nextWeekBounds.weekEnd, 'week');
  const thisMonth = calculatePeriodSummary(contracts, shifts, monthBounds.monthStart, monthBounds.monthEnd, 'month');
  
  return {
    thisWeek,
    nextWeek,
    thisMonth
  };
}

/**
 * Calculate summary for a given period
 */
function calculatePeriodSummary(
  contracts: Contract[],
  shifts: Shift[],
  periodStart: string,
  periodEnd: string,
  periodType: 'week' | 'month'
): SummaryCard {
  let totalHours = 0;
  let totalEarnings = 0;
  
  // Group shifts by contract
  const contractMap = new Map<number, Contract>();
  contracts.forEach(contract => contractMap.set(contract.id, contract));
  
  // Calculate for each contract
  contracts.forEach(contract => {
    let result;
    if (periodType === 'week') {
      result = weeklyEarningsForContract(contract, periodStart, periodEnd, shifts);
    } else {
      result = monthlyEarningsForContract(contract, periodStart, periodEnd, shifts);
    }
    
    totalHours += result.hours;
    totalEarnings += result.earnings;
  });
  
  // Also handle shifts without contracts (earnings = 0 but count hours)
  const contractlessShifts = shifts.filter(shift => 
    !shift.contractId &&
    shift.shiftDate >= periodStart &&
    shift.shiftDate <= periodEnd
  );
  
  contractlessShifts.forEach((shift: Shift) => {
    // Add hours but no earnings for contractless shifts
    const hours = calculateShiftHours(shift.startTime, shift.endTime);
    totalHours += hours;
  });
  
  return {
    hours: Math.round(totalHours * 10) / 10, // Round to 1 decimal
    earnings: Math.round(totalEarnings * 100) / 100 // Round to 2 decimals
  };
}

/**
 * Helper to calculate shift hours from time strings
 */
function calculateShiftHours(startTime: string, endTime: string): number {
  const [startHour, startMin] = startTime.split(':').map(Number);
  const [endHour, endMin] = endTime.split(':').map(Number);
  
  let startMinutes = startHour * 60 + startMin;
  let endMinutes = endHour * 60 + endMin;
  
  // Handle overnight shifts
  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
}

/**
 * Get upcoming shifts with contract details
 */
export async function getUpcoming(limit: number = 10, userId: string): Promise<UpcomingShift[]> {
  const [contracts, shifts] = await Promise.all([
    storage.listContracts(userId),
    storage.getAllShifts(userId)
  ]);
  
  const contractMap = new Map<number, Contract>();
  contracts.forEach(contract => contractMap.set(contract.id, contract));
  
  // Get current date and time
  const now = DateTime.now();
  const nowDateStr = now.toISODate()!;
  const nowTimeStr = now.toFormat('HH:mm');
  
  // Filter future shifts
  const futureShifts = shifts.filter(shift => {
    const shiftDateTime = combineDateTime(shift.shiftDate, shift.startTime);
    return shiftDateTime > now;
  });
  
  // Sort by date and time ascending
  futureShifts.sort((a, b) => {
    if (a.shiftDate !== b.shiftDate) {
      return a.shiftDate.localeCompare(b.shiftDate);
    }
    return a.startTime.localeCompare(b.startTime);
  });
  
  // Take only the requested limit
  const limitedShifts = futureShifts.slice(0, limit);
  
  // Transform to UpcomingShift format
  return limitedShifts.map(shift => {
    const contract = shift.contractId ? contractMap.get(shift.contractId) : undefined;
    
    return {
      id: shift.id,
      localDate: shift.shiftDate,
      localStart: shift.startTime,
      localEnd: shift.endTime,
      contract: contract ? {
        name: contract.name,
        facility: contract.facility,
        baseRate: contract.baseRate,
        timezone: 'America/Chicago' // Default timezone for now
      } : undefined
    };
  });
}