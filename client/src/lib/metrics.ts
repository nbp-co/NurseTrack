import { Contract, Shift, Expense } from '../types';

export interface DashboardMetrics {
  completeCount: number;
  remainingCount: number;
  percentage: number;
}

export interface WeeklySummary {
  contractId: string;
  contractName: string;
  hours: number;
  earnings: number;
  shifts: number;
}

export function getDaysCompleteAndRemaining({
  from,
  to,
  completedShiftDates
}: {
  from: string;
  to: string;
  completedShiftDates: string[];
}): DashboardMetrics {
  const startDate = new Date(from);
  const endDate = new Date(to);
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  
  const completeCount = completedShiftDates.length;
  const remainingCount = Math.max(0, totalDays - completeCount);
  const percentage = totalDays > 0 ? Math.round((completeCount / totalDays) * 100) : 0;
  
  return {
    completeCount,
    remainingCount,
    percentage
  };
}

export function getWeeklySummaries(
  contracts: Contract[],
  shifts: Shift[],
  weekStartDate: string
): { contractSummaries: WeeklySummary[]; overallTotal: WeeklySummary } {
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  
  const weekStartStr = weekStart.toISOString().split('T')[0];
  const weekEndStr = weekEnd.toISOString().split('T')[0];
  
  const weekShifts = shifts.filter(shift => 
    shift.date >= weekStartStr && shift.date < weekEndStr
  );
  
  const contractSummaries: WeeklySummary[] = contracts
    .filter(contract => contract.status === 'active')
    .map(contract => {
      const contractShifts = weekShifts.filter(shift => shift.contractId === contract.id);
      const hours = contractShifts.reduce((sum, shift) => {
        if (shift.completed && shift.actualStart && shift.actualEnd) {
          const start = parseTime(shift.actualStart);
          const end = parseTime(shift.actualEnd);
          return sum + (end - start) / (1000 * 60 * 60);
        } else if (!shift.completed) {
          const start = parseTime(shift.start);
          const end = parseTime(shift.end);
          return sum + (end - start) / (1000 * 60 * 60);
        }
        return sum;
      }, 0);
      
      const earnings = hours * contract.baseRate;
      
      return {
        contractId: contract.id,
        contractName: contract.facility,
        hours: Math.round(hours * 10) / 10,
        earnings: Math.round(earnings * 100) / 100,
        shifts: contractShifts.length
      };
    });
  
  const overallTotal: WeeklySummary = {
    contractId: 'total',
    contractName: 'Total',
    hours: contractSummaries.reduce((sum, summary) => sum + summary.hours, 0),
    earnings: contractSummaries.reduce((sum, summary) => sum + summary.earnings, 0),
    shifts: contractSummaries.reduce((sum, summary) => sum + summary.shifts, 0)
  };
  
  return { contractSummaries, overallTotal };
}

export function calculateMonthlyEarnings(contracts: Contract[], shifts: Shift[], month: string): number {
  const monthShifts = shifts.filter(shift => shift.date.startsWith(month.substring(0, 7)));
  
  return monthShifts.reduce((total, shift) => {
    const contract = contracts.find(c => c.id === shift.contractId);
    if (!contract) return total;
    
    let hours = 0;
    if (shift.completed && shift.actualStart && shift.actualEnd) {
      const start = parseTime(shift.actualStart);
      const end = parseTime(shift.actualEnd);
      hours = (end - start) / (1000 * 60 * 60);
    } else {
      const start = parseTime(shift.start);
      const end = parseTime(shift.end);
      hours = (end - start) / (1000 * 60 * 60);
    }
    
    return total + (hours * contract.baseRate);
  }, 0);
}

export function calculateTotalExpenses(expenses: Expense[], month?: string): number {
  let filteredExpenses = expenses;
  
  if (month) {
    filteredExpenses = expenses.filter(expense => 
      expense.date.startsWith(month.substring(0, 7))
    );
  }
  
  return filteredExpenses.reduce((total, expense) => total + expense.amount, 0);
}

export function calculateDeductibleExpenses(expenses: Expense[], month?: string): number {
  let filteredExpenses = expenses;
  
  if (month) {
    filteredExpenses = expenses.filter(expense => 
      expense.date.startsWith(month.substring(0, 7))
    );
  }
  
  return filteredExpenses
    .filter(expense => expense.deductible)
    .reduce((total, expense) => total + expense.amount, 0);
}

function parseTime(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.getTime();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

export function formatHours(hours: number): string {
  return `${hours} hour${hours !== 1 ? 's' : ''}`;
}
