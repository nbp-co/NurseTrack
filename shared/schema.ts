import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const contracts = pgTable("contracts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  facility: text("facility").notNull(),
  role: text("role").notNull(),
  department: text("department"),
  startDate: text("start_date").notNull(), // ISO string
  endDate: text("end_date").notNull(),     // ISO string
  payType: text("pay_type").notNull(), // 'hourly' | 'salary'
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  weeklyHours: integer("weekly_hours").notNull(),
  recurrence: jsonb("recurrence").notNull(), // RecurrenceRules
  status: text("status").notNull(), // 'planned' | 'active' | 'completed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const shifts = pgTable("shifts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractId: varchar("contract_id").references(() => contracts.id).notNull(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  date: text("date").notNull(),     // ISO string
  start: text("start").notNull(),   // "07:00"
  end: text("end").notNull(),       // "19:00"
  role: text("role").notNull(),
  facility: text("facility").notNull(),
  completed: boolean("completed").default(false).notNull(),
  actualStart: text("actual_start"), // "07:00"
  actualEnd: text("actual_end"),     // "19:15"
  createdAt: timestamp("created_at").defaultNow(),
});

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contractId: varchar("contract_id").references(() => contracts.id),
  date: text("date").notNull(),       // ISO string
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  note: text("note"),
  deductible: boolean("deductible").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas
export const insertUserSchema = createInsertSchema(users).pick({
  email: true,
  password: true,
  name: true,
  role: true,
});

export const insertContractSchema = createInsertSchema(contracts).pick({
  facility: true,
  role: true,
  department: true,
  startDate: true,
  endDate: true,
  payType: true,
  baseRate: true,
  weeklyHours: true,
  recurrence: true,
  status: true,
});

export const insertShiftSchema = createInsertSchema(shifts).pick({
  contractId: true,
  date: true,
  start: true,
  end: true,
  role: true,
  facility: true,
  completed: true,
  actualStart: true,
  actualEnd: true,
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  contractId: true,
  date: true,
  category: true,
  amount: true,
  description: true,
  note: true,
  deductible: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
