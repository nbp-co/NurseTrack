import { Contract, Shift, Expense, User } from '../types';
import { mockContracts, mockShifts, mockExpenses, mockUser } from '../mocks/seed';

// In-memory storage
let contracts = [...mockContracts];
let shifts = [...mockShifts];
let expenses = [...mockExpenses];
let currentUser: User | null = mockUser;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Auth API
export const authApi = {
  async login(email: string, password: string): Promise<User> {
    await delay(500);
    if (email === 'sarah.johnson@email.com' && password === 'password') {
      return mockUser;
    }
    throw new Error('Invalid credentials');
  },

  async getCurrentUser(): Promise<User | null> {
    await delay(200);
    return currentUser;
  },

  async logout(): Promise<void> {
    await delay(200);
    currentUser = null;
  }
};

// Contract API
export const contractApi = {
  async listContracts(): Promise<Contract[]> {
    await delay(300);
    return [...contracts];
  },

  async getContract(id: string): Promise<Contract | undefined> {
    await delay(200);
    return contracts.find(c => c.id === id);
  },

  async createContract(data: Omit<Contract, 'id'>): Promise<Contract> {
    await delay(500);
    const contract: Contract = {
      ...data,
      id: String(Date.now())
    };
    contracts.push(contract);
    return contract;
  },

  async updateContract(id: string, data: Partial<Contract>): Promise<Contract> {
    await delay(400);
    const index = contracts.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Contract not found');
    
    contracts[index] = { ...contracts[index], ...data };
    return contracts[index];
  }
};

// Shift API
export const shiftApi = {
  async listShifts(filters?: { month?: string; contractId?: string }): Promise<Shift[]> {
    await delay(300);
    let result = [...shifts];
    
    if (filters?.month) {
      const monthPrefix = filters.month.substring(0, 7);
      result = result.filter(s => s.date.startsWith(monthPrefix));
    }
    
    if (filters?.contractId) {
      result = result.filter(s => s.contractId === filters.contractId);
    }
    
    return result.sort((a, b) => a.date.localeCompare(b.date));
  },

  async getShift(id: string): Promise<Shift | undefined> {
    await delay(200);
    return shifts.find(s => s.id === id);
  },

  async createShift(data: Omit<Shift, 'id'>): Promise<Shift> {
    await delay(500);
    const shift: Shift = {
      ...data,
      id: String(Date.now())
    };
    shifts.push(shift);
    return shift;
  },

  async updateShift(id: string, data: Partial<Shift>): Promise<Shift> {
    await delay(400);
    const index = shifts.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Shift not found');
    
    shifts[index] = { ...shifts[index], ...data };
    return shifts[index];
  },

  async confirmShiftCompleted(id: string, updates: { actualStart?: string; actualEnd?: string }): Promise<Shift> {
    await delay(400);
    const index = shifts.findIndex(s => s.id === id);
    if (index === -1) throw new Error('Shift not found');
    
    shifts[index] = {
      ...shifts[index],
      ...updates,
      completed: true
    };
    return shifts[index];
  }
};

// Expense API
export const expenseApi = {
  async listExpenses(filters?: { contractId?: string; category?: string; startDate?: string; endDate?: string }): Promise<Expense[]> {
    await delay(300);
    let result = [...expenses];
    
    if (filters?.contractId) {
      result = result.filter(e => e.contractId === filters.contractId);
    }
    
    if (filters?.category) {
      result = result.filter(e => e.category === filters.category);
    }
    
    if (filters?.startDate) {
      result = result.filter(e => e.date >= filters.startDate!);
    }
    
    if (filters?.endDate) {
      result = result.filter(e => e.date <= filters.endDate!);
    }
    
    return result.sort((a, b) => b.date.localeCompare(a.date));
  },

  async getExpense(id: string): Promise<Expense | undefined> {
    await delay(200);
    return expenses.find(e => e.id === id);
  },

  async createExpense(data: Omit<Expense, 'id'>): Promise<Expense> {
    await delay(500);
    const expense: Expense = {
      ...data,
      id: String(Date.now())
    };
    expenses.push(expense);
    return expense;
  },

  async updateExpense(id: string, data: Partial<Expense>): Promise<Expense> {
    await delay(400);
    const index = expenses.findIndex(e => e.id === id);
    if (index === -1) throw new Error('Expense not found');
    
    expenses[index] = { ...expenses[index], ...data };
    return expenses[index];
  }
};
