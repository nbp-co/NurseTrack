import { DateTime } from 'luxon';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../db';
import { contracts, contractScheduleDay, shifts, type Contract, type ContractScheduleDay, type Shift } from '@shared/schema';
import { generateShiftDates, type ScheduleConfig } from '../services/contracts';

export interface AuditResult {
  contractId: number;
  contractName: string;
  missing: string[];      // Array of dates (YYYY-MM-DD) missing shifts
  duplicates: string[];   // Array of dates with multiple shifts 
  finalizedTouched: number; // Count of finalized shifts that would be affected
  expectedShifts: number;   // Total expected shifts from schedule
  actualShifts: number;     // Actual shifts found in database
  status: 'healthy' | 'has_issues';
}

/**
 * Retrieves the schedule configuration for a contract from the database
 */
async function getContractSchedule(contractId: number): Promise<ScheduleConfig | null> {
  const scheduleDays = await db
    .select()
    .from(contractScheduleDay)
    .where(eq(contractScheduleDay.contractId, contractId));

  if (scheduleDays.length === 0) {
    return null;
  }

  // Find a reasonable default from existing days
  const firstDay = scheduleDays[0];
  const defaultStart = firstDay?.startLocal || '07:00';
  const defaultEnd = firstDay?.endLocal || '19:00';

  const days: Record<string, { enabled: boolean; start?: string; end?: string }> = {};
  
  // Initialize all days as disabled
  for (let i = 0; i <= 6; i++) {
    days[i.toString()] = { enabled: false };
  }

  // Set enabled days with their times
  for (const day of scheduleDays) {
    days[day.weekday.toString()] = {
      enabled: day.enabled,
      start: day.enabled ? day.startLocal : undefined,
      end: day.enabled ? day.endLocal : undefined,
    };
  }

  return {
    defaultStart,
    defaultEnd,
    days,
  };
}

/**
 * Audits a single contract's shift seeding by comparing expected vs actual shifts
 */
export async function auditContract(contractId: number): Promise<AuditResult> {
  // Get contract details
  const [contract] = await db
    .select()
    .from(contracts)
    .where(eq(contracts.id, contractId));

  if (!contract) {
    throw new Error(`Contract ${contractId} not found`);
  }

  // Get schedule configuration
  const schedule = await getContractSchedule(contractId);
  if (!schedule) {
    return {
      contractId,
      contractName: contract.name,
      missing: [],
      duplicates: [],
      finalizedTouched: 0,
      expectedShifts: 0,
      actualShifts: 0,
      status: 'healthy',
    };
  }

  // Generate expected shifts based on contract schedule
  const expectedShifts = generateShiftDates(
    contract.startDate as string,
    contract.endDate as string,
    contract.timezone,
    schedule
  );

  // Get actual shifts from database (contract_seed source only)
  const actualShifts = await db
    .select()
    .from(shifts)
    .where(
      and(
        eq(shifts.contractId, contractId),
        eq(shifts.source, 'contract_seed')
      )
    );

  // Group actual shifts by local date for duplicate detection
  const actualShiftsByDate = new Map<string, Shift[]>();
  for (const shift of actualShifts) {
    const date = shift.localDate as string;
    if (!actualShiftsByDate.has(date)) {
      actualShiftsByDate.set(date, []);
    }
    actualShiftsByDate.get(date)!.push(shift);
  }

  // Find missing dates
  const missing: string[] = [];
  const expectedDates = new Set(expectedShifts.map(s => s.localDate));
  
  for (const expectedDate of Array.from(expectedDates)) {
    if (!actualShiftsByDate.has(expectedDate)) {
      missing.push(expectedDate);
    }
  }

  // Find duplicate dates
  const duplicates: string[] = [];
  for (const [date, shiftsForDate] of Array.from(actualShiftsByDate.entries())) {
    if (shiftsForDate.length > 1) {
      duplicates.push(date);
    }
  }

  // Count finalized shifts that would be affected by missing/duplicates
  const affectedDates = new Set([...missing, ...duplicates]);
  let finalizedTouched = 0;
  
  for (const [date, shiftsForDate] of Array.from(actualShiftsByDate.entries())) {
    if (affectedDates.has(date)) {
      finalizedTouched += shiftsForDate.filter((s: Shift) => s.status === 'Finalized').length;
    }
  }

  const status: 'healthy' | 'has_issues' = 
    missing.length > 0 || duplicates.length > 0 ? 'has_issues' : 'healthy';

  // Add logging for issues
  if (status === 'has_issues') {
    console.warn(`[AUDIT] Contract ${contractId} (${contract.name}) has seeding issues:`);
    if (missing.length > 0) {
      console.warn(`  Missing shifts: ${missing.length} dates - ${missing.slice(0, 5).join(', ')}${missing.length > 5 ? '...' : ''}`);
    }
    if (duplicates.length > 0) {
      console.warn(`  Duplicate shifts: ${duplicates.length} dates - ${duplicates.slice(0, 5).join(', ')}${duplicates.length > 5 ? '...' : ''}`);
    }
    if (finalizedTouched > 0) {
      console.warn(`  ${finalizedTouched} finalized shifts would be affected by re-seeding`);
    }
  }

  return {
    contractId,
    contractName: contract.name,
    missing: missing.sort(),
    duplicates: duplicates.sort(),
    finalizedTouched,
    expectedShifts: expectedShifts.length,
    actualShifts: actualShifts.length,
    status,
  };
}

/**
 * Audits all contracts in the system
 */
export async function auditAllContracts(): Promise<AuditResult[]> {
  const allContracts = await db.select({ id: contracts.id }).from(contracts);
  
  const results: AuditResult[] = [];
  for (const contract of allContracts) {
    try {
      const result = await auditContract(contract.id);
      results.push(result);
    } catch (error) {
      console.error(`Failed to audit contract ${contract.id}:`, error);
      // Continue with other contracts even if one fails
    }
  }
  
  return results;
}