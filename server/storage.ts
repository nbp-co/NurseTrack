import { type User, type InsertUser, type Contract, type InsertContract, type Shift, type InsertShift, type Expense, type InsertExpense } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Contracts
  listContracts(userId: string): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract & { userId: string }): Promise<Contract>;
  updateContract(id: string, contract: Partial<InsertContract>): Promise<Contract | undefined>;

  // Shifts
  listShifts(userId: string, filters?: { month?: string; contractId?: string }): Promise<Shift[]>;
  getShift(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift & { userId: string }): Promise<Shift>;
  updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  confirmShiftCompleted(id: string, updates: { actualStart?: string; actualEnd?: string }): Promise<Shift | undefined>;

  // Expenses
  listExpenses(userId: string, filters?: { contractId?: string; category?: string; startDate?: string; endDate?: string }): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private contracts: Map<string, Contract> = new Map();
  private shifts: Map<string, Shift> = new Map();
  private expenses: Map<string, Expense> = new Map();

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || null,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  // Contracts
  async listContracts(userId: string): Promise<Contract[]> {
    return Array.from(this.contracts.values()).filter(contract => contract.userId === userId);
  }

  async getContract(id: string): Promise<Contract | undefined> {
    return this.contracts.get(id);
  }

  async createContract(contractData: InsertContract & { userId: string }): Promise<Contract> {
    const id = randomUUID();
    const contract: Contract = { 
      ...contractData, 
      id, 
      department: contractData.department || null,
      createdAt: new Date() 
    };
    this.contracts.set(id, contract);
    return contract;
  }

  async updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract | undefined> {
    const contract = this.contracts.get(id);
    if (!contract) return undefined;
    
    const updatedContract = { ...contract, ...updates };
    this.contracts.set(id, updatedContract);
    return updatedContract;
  }

  // Shifts
  async listShifts(userId: string, filters?: { month?: string; contractId?: string }): Promise<Shift[]> {
    let shifts = Array.from(this.shifts.values()).filter(shift => shift.userId === userId);
    
    if (filters?.month) {
      shifts = shifts.filter(shift => shift.date.startsWith(filters.month!.substring(0, 7)));
    }
    
    if (filters?.contractId) {
      shifts = shifts.filter(shift => shift.contractId === filters.contractId);
    }
    
    return shifts.sort((a, b) => a.date.localeCompare(b.date));
  }

  async getShift(id: string): Promise<Shift | undefined> {
    return this.shifts.get(id);
  }

  async createShift(shiftData: InsertShift & { userId: string }): Promise<Shift> {
    const id = randomUUID();
    const shift: Shift = { 
      ...shiftData, 
      id, 
      completed: shiftData.completed || false,
      actualStart: shiftData.actualStart || null,
      actualEnd: shiftData.actualEnd || null,
      createdAt: new Date() 
    };
    this.shifts.set(id, shift);
    return shift;
  }

  async updateShift(id: string, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const shift = this.shifts.get(id);
    if (!shift) return undefined;
    
    const updatedShift = { ...shift, ...updates };
    this.shifts.set(id, updatedShift);
    return updatedShift;
  }

  async confirmShiftCompleted(id: string, updates: { actualStart?: string; actualEnd?: string }): Promise<Shift | undefined> {
    const shift = this.shifts.get(id);
    if (!shift) return undefined;
    
    const updatedShift = { 
      ...shift, 
      ...updates, 
      completed: true 
    };
    this.shifts.set(id, updatedShift);
    return updatedShift;
  }

  // Expenses
  async listExpenses(userId: string, filters?: { contractId?: string; category?: string; startDate?: string; endDate?: string }): Promise<Expense[]> {
    let expenses = Array.from(this.expenses.values()).filter(expense => expense.userId === userId);
    
    if (filters?.contractId) {
      expenses = expenses.filter(expense => expense.contractId === filters.contractId);
    }
    
    if (filters?.category) {
      expenses = expenses.filter(expense => expense.category === filters.category);
    }
    
    if (filters?.startDate) {
      expenses = expenses.filter(expense => expense.date >= filters.startDate!);
    }
    
    if (filters?.endDate) {
      expenses = expenses.filter(expense => expense.date <= filters.endDate!);
    }
    
    return expenses.sort((a, b) => b.date.localeCompare(a.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }

  async createExpense(expenseData: InsertExpense & { userId: string }): Promise<Expense> {
    const id = randomUUID();
    const expense: Expense = { 
      ...expenseData, 
      id, 
      note: expenseData.note || null,
      createdAt: new Date() 
    };
    this.expenses.set(id, expense);
    return expense;
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const expense = this.expenses.get(id);
    if (!expense) return undefined;
    
    const updatedExpense = { ...expense, ...updates };
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }
}

export const storage = new MemStorage();
