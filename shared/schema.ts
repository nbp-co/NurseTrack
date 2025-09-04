import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, jsonb, date, time, smallint, index, unique, serial } from "drizzle-orm/pg-core";
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
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  facility: text("facility").notNull(),
  role: text("role").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  otRate: decimal("ot_rate", { precision: 10, scale: 2 }),
  hoursPerWeek: decimal("hours_per_week", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("planned"),
  timezone: text("timezone").notNull().default("America/Chicago"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  statusDateIdx: index("contracts_status_date_idx").on(table.status, table.startDate, table.endDate),
}));

export const contractScheduleDay = pgTable("contract_schedule_day", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  weekday: smallint("weekday").notNull(), // 0=Sun..6=Sat
  enabled: boolean("enabled").notNull().default(false),
  startLocal: time("start_local").notNull().default("07:00"),
  endLocal: time("end_local").notNull().default("19:00"),
}, (table) => ({
  contractWeekdayUnique: unique("contract_schedule_day_contract_weekday_unique").on(table.contractId, table.weekday),
}));

export const shifts = pgTable("shifts", {
  id: serial("id").primaryKey(),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }).notNull(),
  startUtc: timestamp("start_utc", { withTimezone: true }).notNull(),
  endUtc: timestamp("end_utc", { withTimezone: true }).notNull(),
  localDate: date("local_date").notNull(),
  source: text("source").notNull().default("contract_seed"),
  status: text("status").notNull().default("In Process"),
}, (table) => ({
  contractDateIdx: index("shifts_contract_date_idx").on(table.contractId, table.localDate),
  contractDateSourceUnique: unique("shifts_contract_date_source_unique").on(table.contractId, table.localDate, table.source),
}));

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id),
  date: text("date").notNull(),       // ISO string
  category: text("category").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  note: text("note"),
  deductible: boolean("deductible").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  page: text("page").notNull(),
  message: text("message").notNull(),
  type: text("type").notNull(), // 'bug' | 'feature' | 'general'
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
  name: true,
  facility: true,
  role: true,
  startDate: true,
  endDate: true,
  baseRate: true,
  otRate: true,
  hoursPerWeek: true,
  status: true,
  timezone: true,
});

export const insertContractScheduleDaySchema = createInsertSchema(contractScheduleDay).pick({
  contractId: true,
  weekday: true,
  enabled: true,
  startLocal: true,
  endLocal: true,
});

export const insertShiftSchema = createInsertSchema(shifts).pick({
  contractId: true,
  startUtc: true,
  endUtc: true,
  localDate: true,
  source: true,
  status: true,
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

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  page: true,
  message: true,
  type: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContract = z.infer<typeof insertContractSchema>;
export type Contract = typeof contracts.$inferSelect;
export type InsertContractScheduleDay = z.infer<typeof insertContractScheduleDaySchema>;
export type ContractScheduleDay = typeof contractScheduleDay.$inferSelect;
export type InsertShift = z.infer<typeof insertShiftSchema>;
export type Shift = typeof shifts.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
