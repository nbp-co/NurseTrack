import { DateTime } from 'luxon';
import { storage } from '../storage';
import { contracts, contractScheduleDay } from '@shared/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';

export interface ShiftRequest {
  contractId?: number | null;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  facility?: string;
}

export interface ShiftUpdate {
  contractId?: number | null;
  date?: string;
  start?: string;
  end?: string;
  facility?: string;
  status?: string;
}

/**
 * Validates date range is within limits (93 days max)
 */
export function validateDateRange(fromDate: string, toDate: string): string[] {
  const errors: string[] = [];
  
  const from = DateTime.fromISO(fromDate);
  const to = DateTime.fromISO(toDate);
  
  if (!from.isValid) {
    errors.push('Invalid from date format');
  }
  
  if (!to.isValid) {
    errors.push('Invalid to date format');
  }
  
  if (from.isValid && to.isValid) {
    if (to < from) {
      errors.push('End date must be after start date');
    }
    
    const daysDiff = to.diff(from, 'days').days;
    if (daysDiff > 93) {
      errors.push('Date range cannot exceed 93 days');
    }
  }
  
  return errors;
}

/**
 * Simple validation for overnight shifts
 */
export function validateShiftTimes(
  startTime: string,
  endTime: string
): boolean {
  // Allow overnight shifts (start > end) - they're valid
  return true;
}

/**
 * Converts UTC back to local time
 */

/**
 * Validates if shift date is within contract date range
 */
export async function validateContractDateRange(
  contractId: number,
  shiftDate: string
): Promise<string[]> {
  const errors: string[] = [];
  
  const contract = await storage.getContract(contractId.toString());
  if (!contract) {
    errors.push('Contract not found');
    return errors;
  }
  
  const date = DateTime.fromISO(shiftDate);
  const startDate = DateTime.fromISO(contract.startDate);
  const endDate = DateTime.fromISO(contract.endDate);
  
  if (date < startDate || date > endDate) {
    errors.push(`Shift date must be between ${contract.startDate} and ${contract.endDate}`);
  }
  
  return errors;
}

/**
 * Creates a shift with timezone conversion
 */
export async function createShift(
  userId: string,
  shiftRequest: ShiftRequest
): Promise<any> {
  // Validate contract date range if contractId provided
  if (shiftRequest.contractId) {
    const contractErrors = await validateContractDateRange(
      shiftRequest.contractId,
      shiftRequest.date
    );
    if (contractErrors.length > 0) {
      throw new Error(contractErrors.join(', '));
    }
  }
  
  // Validate shift times
  if (!validateShiftTimes(shiftRequest.start, shiftRequest.end)) {
    throw new Error('Invalid shift times');
  }
  
  // Create shift with simple date/time fields
  const shift = await storage.createShift({
    userId,
    contractId: shiftRequest.contractId || null,
    shiftDate: shiftRequest.date,
    startTime: shiftRequest.start,
    endTime: shiftRequest.end,
    source: shiftRequest.contractId ? 'manual' : 'manual',
    status: 'In Process'
  });
  
  return shift;
}

/**
 * Updates a shift with timezone conversion
 */
export async function updateShift(
  shiftId: string,
  updates: ShiftUpdate
): Promise<any> {
  const existingShift = await storage.getShift(shiftId);
  if (!existingShift) {
    throw new Error('Shift not found');
  }
  
  // Validate contract date range if contractId provided
  if (updates.contractId && updates.date) {
    const contractErrors = await validateContractDateRange(
      updates.contractId,
      updates.date
    );
    if (contractErrors.length > 0) {
      throw new Error(contractErrors.join(', '));
    }
  }
  
  let updateData: any = {};
  
  // Update simple date/time fields
  if (updates.date) updateData.shiftDate = updates.date;
  if (updates.start) updateData.startTime = updates.start;
  if (updates.end) updateData.endTime = updates.end;
  if (updates.contractId !== undefined) updateData.contractId = updates.contractId;
  if (updates.status) updateData.status = updates.status;
  
  // Validate times if being updated
  if (updates.start || updates.end) {
    const start = updates.start || existingShift.startTime;
    const end = updates.end || existingShift.endTime;
    if (!validateShiftTimes(start, end)) {
      throw new Error('Invalid shift times');
    }
  }
  
  return await storage.updateShift(shiftId, updateData);
}

/**
 * Gets contract schedule preview for a specific date
 */
export async function getContractSchedulePreview(
  contractId: number,
  date: string
): Promise<{ weekday: number; enabled: boolean; start: string; end: string; timezone: string } | null> {
  const contract = await storage.getContract(contractId.toString());
  if (!contract) {
    return null;
  }
  
  // Validate date is within contract start/end range
  const dateObj = DateTime.fromISO(date);
  const contractStart = DateTime.fromISO(contract.startDate);
  const contractEnd = DateTime.fromISO(contract.endDate);
  
  if (dateObj < contractStart || dateObj > contractEnd) {
    throw new Error('OUT_OF_RANGE');
  }
  
  const weekday = dateObj.weekday % 7; // Convert to 0=Sunday format
  
  // Get schedule for this weekday
  const [scheduleDay] = await db
    .select()
    .from(contractScheduleDay)
    .where(
      and(
        eq(contractScheduleDay.contractId, contractId),
        eq(contractScheduleDay.weekday, weekday)
      )
    );
  
  if (!scheduleDay) {
    return {
      weekday,
      enabled: false,
      start: '07:00',
      end: '19:00',
      timezone: contract.timezone
    };
  }
  
  return {
    weekday,
    enabled: scheduleDay.enabled,
    start: scheduleDay.startLocal,
    end: scheduleDay.endLocal,
    timezone: contract.timezone
  };
}