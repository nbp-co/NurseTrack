import { type User, type InsertUser, type Contract, type InsertContract, type Shift, type InsertShift, type Expense, type InsertExpense, type Feedback, type InsertFeedback } from "@shared/schema";
import { db } from "./db";
import { users, contracts, shifts, expenses, feedback } from "@shared/schema";
import { eq, and, gte, lte, desc, sql, isNull, or } from "drizzle-orm";

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
  deleteContract(id: string): Promise<boolean>;

  // Shifts - Calendar API
  getShiftsInRange(userId: string, fromDate: string, toDate: string): Promise<any[]>;
  createShift(shift: InsertShift & { userId: string }): Promise<Shift>;
  updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  deleteShift(id: string): Promise<boolean>;
  
  // Shifts - Legacy
  listShifts(userId: string, filters?: { month?: string; contractId?: string }): Promise<Shift[]>;
  getShift(id: string): Promise<Shift | undefined>;
  createShift(shift: InsertShift & { userId: string }): Promise<Shift>;
  updateShift(id: string, shift: Partial<InsertShift>): Promise<Shift | undefined>;
  confirmShiftCompleted(id: string, updates: { actualStart?: string; actualEnd?: string }): Promise<Shift | undefined>;
  deleteShiftsByContract(contractId: string): Promise<number>;
  getShiftCountByContract(contractId: number): Promise<number>;

  // Expenses
  listExpenses(userId: string, filters?: { contractId?: string; category?: string; startDate?: string; endDate?: string }): Promise<Expense[]>;
  getExpense(id: string): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense & { userId: string }): Promise<Expense>;
  updateExpense(id: string, expense: Partial<InsertExpense>): Promise<Expense | undefined>;

  // Feedback
  listFeedback(): Promise<Feedback[]>;
  createFeedback(feedback: InsertFeedback & { userId?: string }): Promise<Feedback>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Contracts
  async listContracts(userId: string): Promise<Contract[]> {
    return await db
      .select()
      .from(contracts)
      .where(eq(contracts.userId, userId))
      .orderBy(desc(contracts.createdAt));
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const contractId = parseInt(id);
    if (isNaN(contractId)) return undefined;
    
    const [contract] = await db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId));
    return contract || undefined;
  }

  async createContract(contractData: InsertContract & { userId: string }): Promise<Contract> {
    const [contract] = await db
      .insert(contracts)
      .values(contractData)
      .returning();
    return contract;
  }

  async updateContract(id: string, updates: Partial<InsertContract>): Promise<Contract | undefined> {
    const contractId = parseInt(id);
    if (isNaN(contractId)) return undefined;
    
    const [contract] = await db
      .update(contracts)
      .set(updates)
      .where(eq(contracts.id, contractId))
      .returning();
    return contract || undefined;
  }

  async deleteContract(id: string): Promise<boolean> {
    const contractId = parseInt(id);
    if (isNaN(contractId)) return false;
    
    const result = await db
      .delete(contracts)
      .where(eq(contracts.id, contractId));
    
    return result.rowCount > 0;
  }

  // Shifts
  async listShifts(userId: string, filters?: { month?: string; contractId?: string }): Promise<any[]> {
    let whereConditions = [eq(shifts.userId, userId)];

    if (filters?.contractId) {
      const contractId = parseInt(filters.contractId);
      if (!isNaN(contractId)) {
        whereConditions.push(eq(shifts.contractId, contractId));
      }
    }

    if (filters?.month) {
      // Month filter format: YYYY-MM
      const [year, month] = filters.month.split('-');
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-31`;
      whereConditions.push(
        gte(shifts.shiftDate, startDate),
        lte(shifts.shiftDate, endDate)
      );
    }

    const query = db
      .select({
        id: shifts.id,
        userId: shifts.userId,
        contractId: shifts.contractId,
        shiftDate: shifts.shiftDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        source: shifts.source,
        status: shifts.status,
        contractName: contracts.name,
        facility: contracts.facility,
        role: contracts.role,
      })
      .from(shifts)
      .innerJoin(contracts, eq(shifts.contractId, contracts.id))
      .where(and(...whereConditions))
      .orderBy(shifts.shiftDate, shifts.startTime);

    return await query;
  }

  async getShift(id: string): Promise<Shift | undefined> {
    const shiftId = parseInt(id);
    if (isNaN(shiftId)) return undefined;
    
    const [shift] = await db
      .select()
      .from(shifts)
      .where(eq(shifts.id, shiftId));
    return shift || undefined;
  }

  async createShift(shiftData: InsertShift & { userId: string }): Promise<Shift> {
    const [shift] = await db
      .insert(shifts)
      .values(shiftData)
      .returning();
    return shift;
  }

  async updateShift(id: string, updates: Partial<InsertShift>): Promise<Shift | undefined> {
    const shiftId = parseInt(id);
    if (isNaN(shiftId)) return undefined;
    
    const [shift] = await db
      .update(shifts)
      .set(updates)
      .where(eq(shifts.id, shiftId))
      .returning();
    return shift || undefined;
  }

  async confirmShiftCompleted(id: string, updates: { actualStart?: string; actualEnd?: string }): Promise<Shift | undefined> {
    const shiftId = parseInt(id);
    if (isNaN(shiftId)) return undefined;
    
    const [shift] = await db
      .update(shifts)
      .set({ 
        status: "Completed",
        ...updates 
      })
      .where(eq(shifts.id, shiftId))
      .returning();
    return shift || undefined;
  }

  async deleteShiftsByContract(contractId: string): Promise<number> {
    const contractIdNum = parseInt(contractId);
    if (isNaN(contractIdNum)) return 0;
    
    const result = await db
      .delete(shifts)
      .where(eq(shifts.contractId, contractIdNum));
    
    return result.rowCount || 0;
  }

  async getShiftCountByContract(contractId: number): Promise<number> {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(shifts)
      .where(eq(shifts.contractId, contractId));
    
    return result[0]?.count || 0;
  }

  // Calendar API Methods
  async getShiftsInRange(userId: string, fromDate: string, toDate: string): Promise<any[]> {
    const result = await db
      .select({
        id: shifts.id,
        contractId: shifts.contractId,
        shiftDate: shifts.shiftDate,
        startTime: shifts.startTime,
        endTime: shifts.endTime,
        status: shifts.status,
        source: shifts.source,
        contractName: contracts.name,
        contractFacility: contracts.facility,
        contractRole: contracts.role,
        contractBaseRate: contracts.baseRate,
      })
      .from(shifts)
      .leftJoin(contracts, eq(shifts.contractId, contracts.id))
      .where(
        and(
          eq(shifts.userId, userId),
          gte(shifts.shiftDate, fromDate),
          lte(shifts.shiftDate, toDate),
          // Filter for seeded (source='contract_seed') + manual shifts
          or(
            eq(shifts.source, 'contract_seed'),
            eq(shifts.source, 'manual')
          )
        )
      )
      .orderBy(shifts.shiftDate, shifts.startTime);

    return result.map(row => ({
      id: row.id,
      contractId: row.contractId,
      localDate: row.shiftDate,
      startUtc: row.startTime,
      endUtc: row.endTime,
      status: row.status,
      source: row.source,
      facility: row.contractFacility,
      contract: row.contractId ? {
        id: row.contractId,
        name: row.contractName,
        facility: row.contractFacility,
        base_rate: row.contractBaseRate,
      } : null
    }));
  }


  async deleteShift(id: string): Promise<boolean> {
    const shiftId = parseInt(id);
    if (isNaN(shiftId)) return false;
    
    const result = await db
      .delete(shifts)
      .where(eq(shifts.id, shiftId));
    
    return result.rowCount > 0;
  }

  // Expenses
  async listExpenses(userId: string, filters?: { contractId?: string; category?: string; startDate?: string; endDate?: string }): Promise<Expense[]> {
    let query = db
      .select()
      .from(expenses)
      .where(eq(expenses.userId, userId));

    if (filters?.contractId) {
      const contractId = parseInt(filters.contractId);
      if (!isNaN(contractId)) {
        query = query.where(and(
          eq(expenses.userId, userId),
          eq(expenses.contractId, contractId)
        ));
      }
    }

    if (filters?.category) {
      query = query.where(and(
        eq(expenses.userId, userId),
        eq(expenses.category, filters.category)
      ));
    }

    if (filters?.startDate) {
      query = query.where(and(
        eq(expenses.userId, userId),
        gte(expenses.date, filters.startDate)
      ));
    }

    if (filters?.endDate) {
      query = query.where(and(
        eq(expenses.userId, userId),
        lte(expenses.date, filters.endDate)
      ));
    }

    return await query.orderBy(desc(expenses.date));
  }

  async getExpense(id: string): Promise<Expense | undefined> {
    const [expense] = await db
      .select()
      .from(expenses)
      .where(eq(expenses.id, id));
    return expense || undefined;
  }

  async createExpense(expenseData: InsertExpense & { userId: string }): Promise<Expense> {
    const [expense] = await db
      .insert(expenses)
      .values(expenseData)
      .returning();
    return expense;
  }

  async updateExpense(id: string, updates: Partial<InsertExpense>): Promise<Expense | undefined> {
    const [expense] = await db
      .update(expenses)
      .set(updates)
      .where(eq(expenses.id, id))
      .returning();
    return expense || undefined;
  }

  // Feedback
  async listFeedback(): Promise<Feedback[]> {
    return await db
      .select()
      .from(feedback)
      .orderBy(desc(feedback.createdAt));
  }

  async createFeedback(feedbackData: InsertFeedback & { userId?: string }): Promise<Feedback> {
    const [newFeedback] = await db
      .insert(feedback)
      .values(feedbackData)
      .returning();
    return newFeedback;
  }
}

export const storage = new DatabaseStorage();