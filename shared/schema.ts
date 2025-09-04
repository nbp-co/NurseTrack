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
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: text("name").notNull(),
  facility: text("facility").notNull(),
  role: text("role").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }).notNull(),
  otRate: decimal("ot_rate", { precision: 10, scale: 2 }),
  hoursPerWeek: decimal("hours_per_week", { precision: 5, scale: 2 }),
  status: text("status").notNull().default("unconfirmed"),
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
  userId: varchar("user_id").references(() => users.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id, { onDelete: "cascade" }),
  shiftDate: date("shift_date").notNull(),
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  facility: text("facility"),
  source: text("source").notNull().default("contract_seed"),
  status: text("status").notNull().default("In Process"),
  baseRate: decimal("base_rate", { precision: 10, scale: 2 }),
  otRate: decimal("ot_rate", { precision: 10, scale: 2 }),
}, (table) => ({
  contractDateIdx: index("shifts_contract_date_idx").on(table.contractId, table.shiftDate),
  contractDateSourceUnique: unique("shifts_contract_date_source_unique").on(table.contractId, table.shiftDate, table.source),
}));

export const expenses = pgTable("expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  contractId: integer("contract_id").references(() => contracts.id),
  date: date("date").notNull(),
  description: text("description").notNull(),
  amountCents: integer("amount_cents").notNull(),
  category: varchar("category").notNull(),
  note: text("note"),
  isTaxDeductible: boolean("is_tax_deductible").default(false).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  userDateIdx: index("expenses_user_date_idx").on(table.userId, table.date),
  contractIdx: index("expenses_contract_idx").on(table.contractId),
  createdAtIdx: index("expenses_created_at_idx").on(table.createdAt),
}));

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
  shiftDate: true,
  startTime: true,
  endTime: true,
  source: true,
  status: true,
  baseRate: true,
  otRate: true,
});

// Calendar-specific schemas
export const createShiftRequestSchema = z.object({
  contractId: z.number().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm
  facility: z.string().optional(),
  baseRate: z.string().optional(),
  otRate: z.string().optional(),
});

export const updateShiftRequestSchema = z.object({
  contractId: z.number().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:mm
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:mm
  facility: z.string().optional(),
  status: z.string().optional(),
});

export const getShiftsQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  userId: z.string(),
});

export const insertExpenseSchema = createInsertSchema(expenses).pick({
  contractId: true,
  date: true,
  category: true,
  amountCents: true,
  description: true,
  note: true,
  isTaxDeductible: true,
});

export const createExpenseRequestSchema = z.object({
  contractId: z.number().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  category: z.enum(["Meals", "Supplies", "Transportation", "Lodging", "Fees", "Other"]),
  amount: z.number().positive(), // dollars, will be converted to cents
  description: z.string().min(1),
  note: z.string().optional(),
  isTaxDeductible: z.boolean().optional().default(false),
});

export const updateExpenseRequestSchema = z.object({
  contractId: z.number().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  category: z.enum(["Meals", "Supplies", "Transportation", "Lodging", "Fees", "Other"]).optional(),
  amount: z.number().positive().optional(), // dollars, will be converted to cents
  description: z.string().min(1).optional(),
  note: z.string().optional(),
  isTaxDeductible: z.boolean().optional(),
});

export const getExpensesQuerySchema = z.object({
  userId: z.string(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  limit: z.string().transform(val => parseInt(val, 10)).optional(),
  offset: z.string().transform(val => parseInt(val, 10)).optional(),
  sort: z.enum(["asc", "desc"]).optional().default("desc"),
});

export const insertFeedbackSchema = createInsertSchema(feedback).pick({
  page: true,
  message: true,
  type: true,
});

// API-specific schemas for contract management
export const scheduleDaySchema = z.object({
  enabled: z.boolean(),
  start: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(), // HH:mm format
  end: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),   // HH:mm format
});

export const scheduleConfigSchema = z.object({
  defaultStart: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/), // HH:mm format
  defaultEnd: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),   // HH:mm format
  days: z.record(z.string(), scheduleDaySchema), // "0" to "6" for weekdays
});

export const createContractRequestSchema = z.object({
  name: z.string().min(1),
  facility: z.string().optional(),
  status: z.enum(["active", "unconfirmed", "completed", "archive"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),   // YYYY-MM-DD
  baseRate: z.string().min(1),
  otRate: z.string().optional().transform(val => val === '' || val === undefined ? undefined : val),
  hoursPerWeek: z.string().optional().transform(val => val === '' || val === undefined ? undefined : val),

  schedule: scheduleConfigSchema,
  seedShifts: z.boolean(),
}).refine((data) => {
  const start = new Date(data.startDate);
  const end = new Date(data.endDate);
  return end >= start;
}, {
  message: "endDate must be greater than or equal to startDate",
  path: ["endDate"],
});

export const updateContractRequestSchema = z.object({
  name: z.string().min(1).optional(),
  facility: z.string().optional(),
  status: z.enum(["active", "unconfirmed", "completed", "archive"]).optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), // YYYY-MM-DD
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),   // YYYY-MM-DD
  baseRate: z.string().optional(),
  otRate: z.string().optional().transform(val => val === '' || val === undefined ? undefined : val),
  hoursPerWeek: z.string().optional().transform(val => val === '' || val === undefined ? undefined : val),

  schedule: scheduleConfigSchema.optional(),
  seedShifts: z.boolean().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return end >= start;
  }
  return true;
}, {
  message: "endDate must be greater than or equal to startDate",
  path: ["endDate"],
});

export const updateContractStatusSchema = z.object({
  status: z.enum(['planned', 'active', 'archived']),
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
export type CreateExpenseRequest = z.infer<typeof createExpenseRequestSchema>;
export type UpdateExpenseRequest = z.infer<typeof updateExpenseRequestSchema>;
export type GetExpensesQuery = z.infer<typeof getExpensesQuerySchema>;
export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;
export type ScheduleDay = z.infer<typeof scheduleDaySchema>;
export type ScheduleConfig = z.infer<typeof scheduleConfigSchema>;
export type CreateContractRequest = z.infer<typeof createContractRequestSchema>;
export type UpdateContractRequest = z.infer<typeof updateContractRequestSchema>;
export type UpdateContractStatusRequest = z.infer<typeof updateContractStatusSchema>;
export type CreateShiftRequest = z.infer<typeof createShiftRequestSchema>;
export type UpdateShiftRequest = z.infer<typeof updateShiftRequestSchema>;
export type GetShiftsQuery = z.infer<typeof getShiftsQuerySchema>;
