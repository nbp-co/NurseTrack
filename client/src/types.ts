export interface Contract {
  id: string;
  facility: string;
  role: string;
  department?: string;
  startDate: string; // ISO
  endDate: string;   // ISO
  payType: 'hourly' | 'salary';
  baseRate: number;
  overtimeRate?: number;
  weeklyHours: number;
  recurrence: {
    byDay: ('SUN'|'MON'|'TUE'|'WED'|'THU'|'FRI'|'SAT')[];
    defaultStart: string; // "07:00"
    defaultEnd: string;   // "19:00"
    exceptions?: { date: string; note?: string }[];
  };
  status: 'planned' | 'active' | 'completed';
  address?: string;
  contactName?: string;
  phoneNumber?: string;
  notes?: string;
}

export interface Shift {
  id: string;
  contractId: string;
  date: string;   // ISO
  start: string;  // "07:00"
  end: string;    // "19:00"
  role: string;
  facility: string;
  completed: boolean;
  actualStart?: string;  // "07:00"
  actualEnd?: string;    // "19:15"
}

export interface Expense {
  id: string;
  date: string;       // ISO
  contractId?: string;
  category: string;
  amount: number;
  description: string;
  note?: string;
  deductible: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role?: string;
}

export interface CalendarEvent {
  id: string;
  date: string;
  type: 'shift' | 'expense';
  completed?: boolean;
}

export interface DashboardStats {
  activeContracts: number;
  monthlyEarnings: number;
  hoursWorked: number;
  weeklyStats: {
    hours: number;
    earnings: number;
    remaining: number;
  };
}

export interface MonthlyProgress {
  complete: number;
  remaining: number;
  percentage: number;
}
