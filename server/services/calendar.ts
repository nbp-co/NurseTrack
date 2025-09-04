import { DateTime } from 'luxon';
import { storage } from '../storage';
import { contracts, contractScheduleDay } from '@shared/schema';
import { db } from '../db';
import { eq, and } from 'drizzle-orm';

export interface TimezoneShiftRequest {
  contractId?: number | null;
  date: string; // YYYY-MM-DD
  start: string; // HH:mm
  end: string; // HH:mm
  timezone: string;
  facility?: string;
}

export interface TimezoneShiftUpdate {
  contractId?: number | null;
  date?: string;
  start?: string;
  end?: string;
  timezone?: string;
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
 * Converts local time to UTC using timezone and handles overnight shifts
 */
export function convertLocalToUtc(
  date: string,
  startTime: string,
  endTime: string,
  timezone: string
): { startUtc: Date; endUtc: Date } {
  const startLocal = DateTime.fromISO(`${date}T${startTime}`, { zone: timezone });
  let endLocal = DateTime.fromISO(`${date}T${endTime}`, { zone: timezone });
  
  // Handle overnight shifts (start > end)
  if (endTime < startTime) {
    endLocal = endLocal.plus({ days: 1 });
  }
  
  return {
    startUtc: startLocal.toUTC().toJSDate(),
    endUtc: endLocal.toUTC().toJSDate()
  };
}

/**
 * Converts UTC back to local time
 */
export function convertUtcToLocal(
  startUtc: Date,
  endUtc: Date,
  timezone: string
): { localDate: string; start: string; end: string } {
  const startLocal = DateTime.fromJSDate(startUtc).setZone(timezone);
  const endLocal = DateTime.fromJSDate(endUtc).setZone(timezone);
  
  return {
    localDate: startLocal.toISODate()!,
    start: startLocal.toFormat('HH:mm'),
    end: endLocal.toFormat('HH:mm')
  };
}

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
export async function createShiftWithTimezone(
  userId: string,
  shiftRequest: TimezoneShiftRequest
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
  
  // Convert local times to UTC
  const { startUtc, endUtc } = convertLocalToUtc(
    shiftRequest.date,
    shiftRequest.start,
    shiftRequest.end,
    shiftRequest.timezone
  );
  
  // Create shift
  const shift = await storage.createShiftWithTimezone({
    userId,
    contractId: shiftRequest.contractId || null,
    startUtc,
    endUtc,
    localDate: shiftRequest.date,
    source: shiftRequest.contractId ? 'manual' : 'manual',
    status: 'In Process'
  });
  
  return shift;
}

/**
 * Updates a shift with timezone conversion
 */
export async function updateShiftWithTimezone(
  shiftId: string,
  updates: TimezoneShiftUpdate
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
  
  // If time or date changed, recalculate UTC
  if (updates.date || updates.start || updates.end || updates.timezone) {
    const date = updates.date || existingShift.localDate;
    const timezone = updates.timezone || 'America/Chicago'; // fallback
    
    // Get existing local times if not updating
    const existingLocal = convertUtcToLocal(
      existingShift.startUtc,
      existingShift.endUtc,
      timezone
    );
    
    const start = updates.start || existingLocal.start;
    const end = updates.end || existingLocal.end;
    
    const { startUtc, endUtc } = convertLocalToUtc(date, start, end, timezone);
    
    updateData = {
      ...updateData,
      startUtc,
      endUtc,
      localDate: date
    };
  }
  
  // Add other updates
  if (updates.contractId !== undefined) updateData.contractId = updates.contractId;
  if (updates.status) updateData.status = updates.status;
  
  return await storage.updateShiftWithTimezone(shiftId, updateData);
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
  
  const dateObj = DateTime.fromISO(date);
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