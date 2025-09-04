import { DateTime } from 'luxon';
import { eq, and, inArray, gte, lte } from 'drizzle-orm';
import { db } from '../db';
import { contracts, contractScheduleDay, shifts, type Contract, type ContractScheduleDay, type Shift } from '@shared/schema';

export type ShiftStatus = 'Planned' | 'In Process' | 'Finalized' | 'Cancelled';

export interface ScheduleDay {
  enabled: boolean;
  start?: string; // HH:mm format
  end?: string;   // HH:mm format
}

export interface ScheduleConfig {
  defaultStart: string; // HH:mm format
  defaultEnd: string;   // HH:mm format
  days: Record<string, ScheduleDay>; // "0" to "6" for Sunday to Saturday
}

export interface CreateContractRequest {
  name: string;
  facility: string;
  role: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  baseRate: string;
  otRate?: string;
  hoursPerWeek?: string;
  timezone: string;
  schedule: ScheduleConfig;
  seedShifts: boolean;
}

export interface UpdateContractRequest extends Partial<CreateContractRequest> {}

export interface SeedResult {
  contractId: number;
  totalDays: number;
  enabledDays: number;
  created: number;
  skipped: number;
}

export interface UpdateResult {
  created: number;
  updated: number;
  deleted: number;
}

export function validateSchedule(schedule: ScheduleConfig, seedShifts: boolean): string[] {
  const errors: string[] = [];

  // Check if at least one day is enabled when seedShifts is true
  if (seedShifts) {
    const hasEnabledDay = Object.values(schedule.days).some(day => day.enabled);
    if (!hasEnabledDay) {
      errors.push('At least one weekday must be enabled when seedShifts is true');
    }
  }

  // Validate time formats
  const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timePattern.test(schedule.defaultStart)) {
    errors.push('defaultStart must be in HH:mm format');
  }
  if (!timePattern.test(schedule.defaultEnd)) {
    errors.push('defaultEnd must be in HH:mm format');
  }

  for (const [dayIndex, day] of Object.entries(schedule.days)) {
    if (day.start && !timePattern.test(day.start)) {
      errors.push(`Day ${dayIndex} start time must be in HH:mm format`);
    }
    if (day.end && !timePattern.test(day.end)) {
      errors.push(`Day ${dayIndex} end time must be in HH:mm format`);
    }
  }

  return errors;
}

export function validateDateRange(startDate: string, endDate: string): string[] {
  const errors: string[] = [];
  
  const start = DateTime.fromISO(startDate);
  const end = DateTime.fromISO(endDate);
  
  if (!start.isValid) {
    errors.push('startDate must be a valid ISO date');
  }
  if (!end.isValid) {
    errors.push('endDate must be a valid ISO date');
  }
  
  if (start.isValid && end.isValid && end < start) {
    errors.push('endDate must be greater than or equal to startDate');
  }
  
  return errors;
}

export function getEffectiveShiftTime(
  dayOfWeek: number, 
  schedule: ScheduleConfig, 
  isStart: boolean
): string {
  const dayConfig = schedule.days[dayOfWeek.toString()];
  if (isStart) {
    return dayConfig?.start || schedule.defaultStart;
  } else {
    return dayConfig?.end || schedule.defaultEnd;
  }
}

export function convertLocalToUtc(
  localDate: string, 
  localTime: string, 
  timezone: string
): DateTime {
  const dateTime = DateTime.fromISO(`${localDate}T${localTime}`, { zone: timezone });
  return dateTime.toUTC();
}

export function generateShiftDates(
  startDate: string,
  endDate: string,
  timezone: string,
  schedule: ScheduleConfig
): Array<{
  localDate: string;
  startUtc: DateTime;
  endUtc: DateTime;
}> {
  const shifts: Array<{
    localDate: string;
    startUtc: DateTime;
    endUtc: DateTime;
  }> = [];

  let currentDate = DateTime.fromISO(startDate, { zone: timezone });
  const end = DateTime.fromISO(endDate, { zone: timezone });

  while (currentDate <= end) {
    const dayOfWeek = currentDate.weekday % 7; // Convert from 1-7 to 0-6 (Sunday-Saturday)
    const dayConfig = schedule.days[dayOfWeek.toString()];

    if (dayConfig?.enabled) {
      const startTime = getEffectiveShiftTime(dayOfWeek, schedule, true);
      const endTime = getEffectiveShiftTime(dayOfWeek, schedule, false);

      const localDateStr = currentDate.toISODate()!;
      
      // Handle overnight shifts (end time next day)
      let endDateTime = DateTime.fromISO(`${localDateStr}T${endTime}`, { zone: timezone });
      const startDateTime = DateTime.fromISO(`${localDateStr}T${startTime}`, { zone: timezone });
      
      if (endDateTime <= startDateTime) {
        // Overnight shift - end time is next day
        endDateTime = endDateTime.plus({ days: 1 });
      }

      shifts.push({
        localDate: localDateStr,
        startUtc: startDateTime.toUTC(),
        endUtc: endDateTime.toUTC(),
      });
    }

    currentDate = currentDate.plus({ days: 1 });
  }

  return shifts;
}

export async function seedShifts(
  contractId: number,
  userId: string,
  startDate: string,
  endDate: string,
  timezone: string,
  schedule: ScheduleConfig
): Promise<SeedResult> {
  const shiftDates = generateShiftDates(startDate, endDate, timezone, schedule);
  
  let created = 0;
  let skipped = 0;

  for (const shift of shiftDates) {
    try {
      await db.insert(shifts).values({
        userId,
        contractId,
        startUtc: shift.startUtc.toJSDate(),
        endUtc: shift.endUtc.toJSDate(),
        localDate: shift.localDate,
        source: 'contract_seed',
        status: 'In Process',
      }).onConflictDoNothing({
        target: [shifts.contractId, shifts.localDate, shifts.source]
      });
      created++;
    } catch (error) {
      // Conflict - shift already exists
      skipped++;
    }
  }

  const totalDays = DateTime.fromISO(endDate).diff(DateTime.fromISO(startDate), 'days').days + 1;
  const enabledDays = shiftDates.length;

  return {
    contractId,
    totalDays,
    enabledDays,
    created,
    skipped,
  };
}

export async function upsertScheduleDays(
  contractId: number,
  schedule: ScheduleConfig
): Promise<void> {
  for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek++) {
    const dayConfig = schedule.days[dayOfWeek.toString()] || { enabled: false };
    const startTime = dayConfig.start || schedule.defaultStart;
    const endTime = dayConfig.end || schedule.defaultEnd;

    await db.insert(contractScheduleDay).values({
      contractId,
      weekday: dayOfWeek,
      enabled: dayConfig.enabled,
      startLocal: startTime,
      endLocal: endTime,
    }).onConflictDoUpdate({
      target: [contractScheduleDay.contractId, contractScheduleDay.weekday],
      set: {
        enabled: dayConfig.enabled,
        startLocal: startTime,
        endLocal: endTime,
      }
    });
  }
}

export async function getContractWithSchedule(contractId: number): Promise<{
  contract: Contract;
  schedule: ContractScheduleDay[];
} | null> {
  const [contract] = await db.select().from(contracts).where(eq(contracts.id, contractId));
  if (!contract) return null;

  const schedule = await db.select()
    .from(contractScheduleDay)
    .where(eq(contractScheduleDay.contractId, contractId))
    .orderBy(contractScheduleDay.weekday);

  return { contract, schedule };
}

export function computeSeedActions(
  oldContract: Contract,
  oldSchedule: ContractScheduleDay[],
  newContract: Partial<Contract>,
  newSchedule: ScheduleConfig
): {
  addDates: string[];
  removeDates: string[];
  updateDates: string[];
} {
  const result = {
    addDates: [] as string[],
    removeDates: [] as string[],
    updateDates: [] as string[]
  };

  // Safety checks
  if (!oldContract || !newSchedule || !oldSchedule) {
    console.error('computeSeedActions: missing required parameters', { 
      hasOldContract: !!oldContract, 
      hasNewSchedule: !!newSchedule, 
      hasOldSchedule: !!oldSchedule 
    });
    return result;
  }

  const oldStart = DateTime.fromISO(oldContract.startDate);
  const oldEnd = DateTime.fromISO(oldContract.endDate);
  const newStart = DateTime.fromISO(newContract.startDate || oldContract.startDate);
  const newEnd = DateTime.fromISO(newContract.endDate || oldContract.endDate);

  // Create maps for easier comparison
  const oldScheduleMap = new Map<number, ContractScheduleDay>();
  oldSchedule.forEach(day => oldScheduleMap.set(day.weekday, day));

  // Range expansion - add new dates
  if (newStart < oldStart) {
    let date = newStart;
    while (date < oldStart) {
      const dayOfWeek = date.weekday % 7;
      const dayConfig = newSchedule.days[dayOfWeek.toString()];
      if (dayConfig?.enabled) {
        result.addDates.push(date.toISODate()!);
      }
      date = date.plus({ days: 1 });
    }
  }

  if (newEnd > oldEnd) {
    let date = oldEnd.plus({ days: 1 });
    while (date <= newEnd) {
      const dayOfWeek = date.weekday % 7;
      const dayConfig = newSchedule.days[dayOfWeek.toString()];
      if (dayConfig?.enabled) {
        result.addDates.push(date.toISODate()!);
      }
      date = date.plus({ days: 1 });
    }
  }

  // Range narrowing - remove dates outside new range
  if (newStart > oldStart || newEnd < oldEnd) {
    let date = oldStart;
    while (date <= oldEnd) {
      if (date < newStart || date > newEnd) {
        result.removeDates.push(date.toISODate()!);
      }
      date = date.plus({ days: 1 });
    }
  }

  // Check for weekday enable/disable changes within overlapping range
  const overlapStart = DateTime.max(oldStart, newStart);
  const overlapEnd = DateTime.min(oldEnd, newEnd);

  if (overlapStart <= overlapEnd) {
    let date = overlapStart;
    while (date <= overlapEnd) {
      const dayOfWeek = date.weekday % 7;
      const oldDay = oldScheduleMap.get(dayOfWeek);
      const newDay = newSchedule.days[dayOfWeek.toString()];

      if (oldDay && newDay) {
        // Check if enabled status changed
        if (oldDay.enabled !== newDay.enabled) {
          if (newDay.enabled) {
            result.addDates.push(date.toISODate()!);
          } else {
            result.removeDates.push(date.toISODate()!);
          }
        }
        // Check if times changed for enabled days
        else if (oldDay.enabled && newDay.enabled) {
          const oldStartTime = oldDay.startLocal;
          const oldEndTime = oldDay.endLocal;
          const newStartTime = newDay.start || newSchedule.defaultStart;
          const newEndTime = newDay.end || newSchedule.defaultEnd;

          if (oldStartTime !== newStartTime || oldEndTime !== newEndTime) {
            result.updateDates.push(date.toISODate()!);
          }
        }
      }

      date = date.plus({ days: 1 });
    }
  }

  return result;
}

export async function applySeedActions(
  contractId: number,
  userId: string,
  actions: { addDates: string[]; removeDates: string[]; updateDates: string[] },
  timezone: string,
  schedule: ScheduleConfig
): Promise<UpdateResult> {
  let created = 0;
  let updated = 0;
  let deleted = 0;

  // Safety checks
  if (!actions || typeof actions !== 'object') {
    console.error('applySeedActions: actions is not a valid object:', actions);
    return { created: 0, updated: 0, deleted: 0 };
  }

  if (!Array.isArray(actions.addDates)) {
    console.error('applySeedActions: actions.addDates is not an array:', actions.addDates);
    actions.addDates = [];
  }

  if (!Array.isArray(actions.removeDates)) {
    console.error('applySeedActions: actions.removeDates is not an array:', actions.removeDates);
    actions.removeDates = [];
  }

  if (!Array.isArray(actions.updateDates)) {
    console.error('applySeedActions: actions.updateDates is not an array:', actions.updateDates);
    actions.updateDates = [];
  }

  // Add new shifts
  for (const dateStr of actions.addDates) {
    const date = DateTime.fromISO(dateStr, { zone: timezone });
    const dayOfWeek = date.weekday % 7;
    const startTime = getEffectiveShiftTime(dayOfWeek, schedule, true);
    const endTime = getEffectiveShiftTime(dayOfWeek, schedule, false);

    let endDateTime = DateTime.fromISO(`${dateStr}T${endTime}`, { zone: timezone });
    const startDateTime = DateTime.fromISO(`${dateStr}T${startTime}`, { zone: timezone });
    
    if (endDateTime <= startDateTime) {
      endDateTime = endDateTime.plus({ days: 1 });
    }

    try {
      await db.insert(shifts).values({
        userId,
        contractId,
        startUtc: startDateTime.toUTC().toJSDate(),
        endUtc: endDateTime.toUTC().toJSDate(),
        localDate: dateStr,
        source: 'contract_seed',
        status: 'In Process',
      });
      created++;
    } catch (error) {
      // Conflict - already exists
    }
  }

  // Remove shifts (only pending ones)
  if (actions.removeDates.length > 0) {
    const deleteResult = await db.delete(shifts)
      .where(and(
        eq(shifts.contractId, contractId),
        eq(shifts.source, 'contract_seed'),
        inArray(shifts.status, ['Planned', 'In Process']),
        inArray(shifts.localDate, actions.removeDates)
      ));
    deleted = deleteResult.rowCount || 0;
  }

  // Update shift times (only pending ones)
  for (const dateStr of actions.updateDates) {
    const date = DateTime.fromISO(dateStr, { zone: timezone });
    const dayOfWeek = date.weekday % 7;
    const startTime = getEffectiveShiftTime(dayOfWeek, schedule, true);
    const endTime = getEffectiveShiftTime(dayOfWeek, schedule, false);

    let endDateTime = DateTime.fromISO(`${dateStr}T${endTime}`, { zone: timezone });
    const startDateTime = DateTime.fromISO(`${dateStr}T${startTime}`, { zone: timezone });
    
    if (endDateTime <= startDateTime) {
      endDateTime = endDateTime.plus({ days: 1 });
    }

    const updateResult = await db.update(shifts)
      .set({
        startUtc: startDateTime.toUTC().toJSDate(),
        endUtc: endDateTime.toUTC().toJSDate(),
      })
      .where(and(
        eq(shifts.contractId, contractId),
        eq(shifts.localDate, dateStr),
        eq(shifts.source, 'contract_seed'),
        inArray(shifts.status, ['Planned', 'In Process'])
      ));
    
    if (updateResult.rowCount && updateResult.rowCount > 0) {
      updated++;
    }
  }

  return { created, updated, deleted };
}