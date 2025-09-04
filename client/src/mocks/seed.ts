import { Contract, Shift, Expense } from '../types';

export const mockContracts: Contract[] = [
  {
    id: '1',
    facility: "St. Mary's Hospital",
    role: 'ICU Nurse',
    department: 'ICU',
    startDate: '2024-01-01',
    endDate: '2024-03-31',
    payType: 'hourly',
    baseRate: 45.00,
    overtimeRate: 67.50,
    weeklyHours: 36,
    recurrence: {
      byDay: ['MON', 'TUE', 'WED'],
      defaultStart: '07:00',
      defaultEnd: '19:00',
      exceptions: []
    },
    status: 'active'
  },
  {
    id: '2',
    facility: 'General Medical Center',
    role: 'ER Nurse',
    department: 'Emergency',
    startDate: '2024-04-01',
    endDate: '2024-06-30',
    payType: 'hourly',
    baseRate: 52.00,
    overtimeRate: 78.00,
    weeklyHours: 40,
    recurrence: {
      byDay: ['TUE', 'WED', 'THU', 'FRI'],
      defaultStart: '06:00',
      defaultEnd: '18:00',
      exceptions: []
    },
    status: 'unconfirmed'
  }
];

export const mockShifts: Shift[] = [
  {
    id: '1',
    contractId: '1',
    date: '2024-03-01',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: true,
    actualStart: '07:00',
    actualEnd: '19:15'
  },
  {
    id: '2',
    contractId: '1',
    date: '2024-03-04',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: true,
    actualStart: '07:00',
    actualEnd: '19:00'
  },
  {
    id: '3',
    contractId: '1',
    date: '2024-03-05',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: true,
    actualStart: '07:00',
    actualEnd: '19:10'
  },
  {
    id: '4',
    contractId: '1',
    date: '2024-03-06',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: true,
    actualStart: '07:00',
    actualEnd: '19:00'
  },
  {
    id: '5',
    contractId: '1',
    date: '2024-03-10',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: true,
    actualStart: '07:00',
    actualEnd: '19:15'
  },
  {
    id: '6',
    contractId: '1',
    date: '2024-03-11',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: false
  },
  {
    id: '7',
    contractId: '1',
    date: '2024-03-12',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: false
  },
  {
    id: '8',
    contractId: '1',
    date: '2024-03-13',
    start: '07:00',
    end: '19:00',
    role: 'ICU Nurse',
    facility: "St. Mary's Hospital",
    completed: false
  }
];

export const mockExpenses: Expense[] = [
  {
    id: '1',
    date: '2024-03-08',
    contractId: '1',
    category: 'Transportation',
    amount: 45.50,
    description: 'Gas for commute',
    deductible: true
  },
  {
    id: '2',
    date: '2024-03-07',
    category: 'Meals',
    amount: 12.99,
    description: 'Lunch during shift',
    deductible: false
  },
  {
    id: '3',
    date: '2024-03-06',
    contractId: '1',
    category: 'Supplies',
    amount: 28.75,
    description: 'Medical supplies',
    deductible: true
  }
];

export const mockUser = {
  id: 'a47111a5-38bb-4dff-a4cb-7cdc5cab2fbc',
  email: 'sarah.johnson@email.com',
  name: 'Sarah Johnson',
  role: 'RN, ICU'
};
