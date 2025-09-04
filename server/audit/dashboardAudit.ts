import { DateTime } from 'luxon';
import { computeSummary } from '../services/dashboard';
import { db } from '../db';
import { shifts, contracts } from '@shared/schema';
import { eq, and, gte, lte, sql } from 'drizzle-orm';

export interface AuditResult {
  period: string;
  serviceHours: number;
  serviceEarnings: number;
  sqlHours: number;
  sqlEarnings: number;
  hoursDiff: number;
  earningsDiff: number;
  hasDiscrepancy: boolean;
}

/**
 * Audit dashboard calculations by comparing service results with direct SQL
 */
export async function auditDashboard(anchorDate: Date = new Date()): Promise<AuditResult[]> {
  const userId = "1"; // Default to first user for audit
  const anchorDateStr = anchorDate.toISOString().split('T')[0];
  
  // Get service results
  const serviceResults = await computeSummary(anchorDate, userId);
  
  // Calculate week boundaries
  const anchorDateTime = DateTime.fromISO(anchorDateStr);
  const thisWeekStart = anchorDateTime.startOf('week').minus({ days: 1 }); // Sunday
  const thisWeekEnd = thisWeekStart.plus({ days: 6 }); // Saturday
  const nextWeekStart = thisWeekEnd.plus({ days: 1 });
  const nextWeekEnd = nextWeekStart.plus({ days: 6 });
  const monthStart = anchorDateTime.startOf('month');
  const monthEnd = anchorDateTime.endOf('month');
  
  // Direct SQL calculations
  const [thisWeekSql, nextWeekSql, monthSql] = await Promise.all([
    calculatePeriodDirectSql(userId, thisWeekStart.toISODate()!, thisWeekEnd.toISODate()!),
    calculatePeriodDirectSql(userId, nextWeekStart.toISODate()!, nextWeekEnd.toISODate()!),
    calculatePeriodDirectSql(userId, monthStart.toISODate()!, monthEnd.toISODate()!)
  ]);
  
  // Compare results and generate audit report
  const results: AuditResult[] = [
    {
      period: 'thisWeek',
      serviceHours: serviceResults.thisWeek.hours,
      serviceEarnings: serviceResults.thisWeek.earnings,
      sqlHours: thisWeekSql.hours,
      sqlEarnings: thisWeekSql.earnings,
      hoursDiff: Math.abs(serviceResults.thisWeek.hours - thisWeekSql.hours),
      earningsDiff: Math.abs(serviceResults.thisWeek.earnings - thisWeekSql.earnings),
      hasDiscrepancy: false
    },
    {
      period: 'nextWeek',
      serviceHours: serviceResults.nextWeek.hours,
      serviceEarnings: serviceResults.nextWeek.earnings,
      sqlHours: nextWeekSql.hours,
      sqlEarnings: nextWeekSql.earnings,
      hoursDiff: Math.abs(serviceResults.nextWeek.hours - nextWeekSql.hours),
      earningsDiff: Math.abs(serviceResults.nextWeek.earnings - nextWeekSql.earnings),
      hasDiscrepancy: false
    },
    {
      period: 'thisMonth',
      serviceHours: serviceResults.thisMonth.hours,
      serviceEarnings: serviceResults.thisMonth.earnings,
      sqlHours: monthSql.hours,
      sqlEarnings: monthSql.earnings,
      hoursDiff: Math.abs(serviceResults.thisMonth.hours - monthSql.hours),
      earningsDiff: Math.abs(serviceResults.thisMonth.earnings - monthSql.earnings),
      hasDiscrepancy: false
    }
  ];
  
  // Check for discrepancies
  results.forEach(result => {
    result.hasDiscrepancy = result.hoursDiff > 0.25 || result.earningsDiff > 1;
    
    if (result.hasDiscrepancy) {
      console.warn(`⚠️  Dashboard audit discrepancy found for ${result.period}:`);
      console.warn(`   Hours: Service=${result.serviceHours}, SQL=${result.sqlHours}, Diff=${result.hoursDiff}`);
      console.warn(`   Earnings: Service=$${result.serviceEarnings}, SQL=$${result.sqlEarnings}, Diff=$${result.earningsDiff}`);
    } else {
      console.log(`✅ Dashboard audit passed for ${result.period}`);
    }
  });
  
  return results;
}

/**
 * Direct SQL calculation for a period (fallback/verification method)
 */
async function calculatePeriodDirectSql(
  userId: string, 
  startDate: string, 
  endDate: string
): Promise<{ hours: number; earnings: number }> {
  
  // Get total hours using SQL
  const hoursResult = await db
    .select({
      totalHours: sql<number>`
        COALESCE(
          SUM(
            EXTRACT(EPOCH FROM (end_time - start_time)) / 3600
          ), 
          0
        )
      `
    })
    .from(shifts)
    .where(
      and(
        eq(shifts.userId, userId),
        gte(shifts.shiftDate, startDate),
        lte(shifts.shiftDate, endDate)
      )
    );
  
  // Simple base rate earnings calculation (no OT logic)
  const earningsResult = await db
    .select({
      totalEarnings: sql<number>`
        COALESCE(
          SUM(
            (EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600) * 
            COALESCE(c.base_rate, 0)
          ),
          0
        )
      `
    })
    .from(shifts)
    .leftJoin(contracts, eq(shifts.contractId, contracts.id))
    .where(
      and(
        eq(shifts.userId, userId),
        gte(shifts.shiftDate, startDate),
        lte(shifts.shiftDate, endDate)
      )
    );
  
  return {
    hours: Math.round((hoursResult[0]?.totalHours || 0) * 10) / 10,
    earnings: Math.round((earningsResult[0]?.totalEarnings || 0) * 100) / 100
  };
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const anchorArg = args.find(arg => arg.startsWith('--anchor='));
  const anchorDate = anchorArg ? new Date(anchorArg.split('=')[1]) : new Date();
  
  console.log(`Running dashboard audit for anchor date: ${anchorDate.toISOString().split('T')[0]}`);
  
  auditDashboard(anchorDate)
    .then(results => {
      console.log('\n📊 Dashboard Audit Complete');
      console.log('================================');
      
      results.forEach(result => {
        console.log(`\n${result.period.toUpperCase()}:`);
        console.log(`  Service: ${result.serviceHours}h, $${result.serviceEarnings}`);
        console.log(`  SQL:     ${result.sqlHours}h, $${result.sqlEarnings}`);
        console.log(`  Status:  ${result.hasDiscrepancy ? '❌ DISCREPANCY' : '✅ MATCH'}`);
      });
      
      const totalDiscrepancies = results.filter(r => r.hasDiscrepancy).length;
      console.log(`\nOverall: ${totalDiscrepancies === 0 ? '✅ All checks passed' : `❌ ${totalDiscrepancies} discrepancies found`}`);
    })
    .catch(console.error);
}