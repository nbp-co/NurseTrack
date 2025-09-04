/**
 * Dashboard service using local naive date/time only
 * No UTC or timezone conversions
 */

import { 
  weekStartSunday, 
  addDays, 
  getTodayLocal, 
  getNowTimeLocal 
} from '../../client/src/lib/localTime';
import { 
  weeklyEarningsForContract, 
  periodSummaryByContract,
  type ShiftRow,
  type ContractRow 
} from './payrollLocal';
import { storage } from '../storage';

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
  id: number | string;
  localDate: string;
  start: string;
  end: string;
  overnight: boolean;
  contract?: {
    id: string;
    name: string;
    facility: string;
    base_rate: string;
    color?: string;
  } | null;
}

/**
 * Get this week boundaries (Sunday to Saturday)
 */
export function getThisWeek(anchor: string): { start: string; end: string } {
  const start = weekStartSunday(anchor);
  const end = addDays(start, 6);
  return { start, end };
}

/**
 * Get next week boundaries 
 */
export function getNextWeek(anchor: string): { start: string; end: string } {
  const thisWeek = getThisWeek(anchor);
  const start = addDays(thisWeek.end, 1);
  const end = addDays(start, 6);
  return { start, end };
}

/**
 * Get this month boundaries
 */
export function getThisMonth(anchor: string): { start: string; end: string } {
  const date = new Date(anchor + 'T00:00:00');
  const year = date.getFullYear();
  const month = date.getMonth();
  
  const start = `${year}-${(month + 1).toString().padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const end = `${year}-${(month + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;
  
  return { start, end };
}

/**
 * Compute dashboard summary using local time calculations
 */
export async function computeSummary(anchor?: string, userId?: string): Promise<DashboardSummary> {
  const anchorDate = anchor || getTodayLocal();
  
  // Get period boundaries
  const thisWeek = getThisWeek(anchorDate);
  const nextWeek = getNextWeek(anchorDate);
  const thisMonth = getThisMonth(anchorDate);
  
  // Load data with buffer for week calculations
  const bufferStart = addDays(thisMonth.start, -7);
  const bufferEnd = addDays(thisMonth.end, 7);
  
  const [allShifts, allContracts] = await Promise.all([
    storage.getAllShifts(userId || '1'),
    storage.listContracts(userId || '1')
  ]);
  
  // Convert to local format and filter by status (include all statuses for calculations)
  const shifts: ShiftRow[] = allShifts
    .filter(s => ['scheduled', 'unconfirmed', 'completed', 'Planned', 'In Process', 'Finalized'].includes(s.status))
    .map(s => ({
      id: s.id,
      shift_date: s.shiftDate,
      start_time: s.startTime,
      end_time: s.endTime,
      contract_id: s.contractId ? s.contractId.toString() : null,
      status: s.status
    }));
  
  // Build contracts map
  const contractsById = new Map<string, ContractRow>();
  allContracts.forEach(c => {
    contractsById.set(c.id.toString(), {
      id: c.id.toString(),
      base_rate: parseFloat(c.baseRate),
      ot_rate: c.otRate ? parseFloat(c.otRate) : null
    });
  });
  
  
  // Calculate summaries
  const thisWeekSummary = periodSummaryByContract(thisWeek.start, thisWeek.end, shifts, contractsById);
  const nextWeekSummary = periodSummaryByContract(nextWeek.start, nextWeek.end, shifts, contractsById);
  const thisMonthSummary = periodSummaryByContract(thisMonth.start, thisMonth.end, shifts, contractsById);
  
  
  return {
    thisWeek: thisWeekSummary,
    nextWeek: nextWeekSummary,
    thisMonth: thisMonthSummary
  };
}

/**
 * Get upcoming shifts with contract details
 */
export async function getUpcoming(limit: number = 10, userId?: string): Promise<UpcomingShift[]> {
  const [allShifts, allContracts] = await Promise.all([
    storage.getAllShifts(userId || '1'),
    storage.listContracts(userId || '1')
  ]);
  
  // Build contracts map
  const contractsById = new Map();
  allContracts.forEach(c => {
    contractsById.set(c.id, {
      id: c.id.toString(),
      name: c.name,
      facility: c.facility,
      base_rate: c.baseRate,
    });
  });
  
  // Get current local date/time for filtering
  const nowDate = getTodayLocal();
  const nowTime = getNowTimeLocal();
  const nowDateTime = `${nowDate} ${nowTime}`;
  
  // Filter and sort future shifts
  const futureShifts = allShifts
    .filter(shift => {
      const shiftDateTime = `${shift.shiftDate} ${shift.startTime}`;
      return shiftDateTime > nowDateTime;
    })
    .sort((a, b) => {
      const aDateTime = `${a.shiftDate} ${a.startTime}`;
      const bDateTime = `${b.shiftDate} ${b.startTime}`;
      return aDateTime.localeCompare(bDateTime);
    })
    .slice(0, limit);
  
  // Transform to UpcomingShift format
  return futureShifts.map(shift => {
    const contract = shift.contractId ? contractsById.get(shift.contractId) : null;
    const isOvernight = shift.endTime < shift.startTime;
    
    return {
      id: shift.id,
      localDate: shift.shiftDate,
      start: shift.startTime,
      end: shift.endTime,
      status: shift.status,
      overnight: isOvernight,
      contract: contract || null
    };
  });
}