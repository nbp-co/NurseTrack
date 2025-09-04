import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertContractSchema, insertShiftSchema, insertExpenseSchema, insertFeedbackSchema, createContractRequestSchema, updateContractRequestSchema, updateContractStatusSchema, createShiftRequestSchema, updateShiftRequestSchema, getShiftsQuerySchema, createExpenseRequestSchema, updateExpenseRequestSchema, getExpensesQuerySchema } from "@shared/schema";
import * as contractsService from "./services/contracts";
import * as calendarService from "./services/calendar";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await storage.getUserByEmail(email);
      
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(userData.email);
      
      if (existingUser) {
        return res.status(409).json({ message: "User already exists" });
      }
      
      const user = await storage.createUser(userData);
      res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } catch (error) {
      res.status(400).json({ message: "Registration failed" });
    }
  });

  // Contract routes with timezone/DST handling and shift seeding
  app.get("/api/contracts", async (req, res) => {
    try {
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      // For now, we'll use the existing storage method and enhance it later
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const contracts = await storage.listContracts(userId);
      
      // Add shift counts and schedule data to each contract
      const contractsWithShiftCounts = await Promise.all(
        contracts.map(async (contract) => {
          const shiftsCount = await storage.getShiftCountByContract(contract.id);
          const contractWithSchedule = await contractsService.getContractWithSchedule(contract.id);
          return {
            ...contract,
            shiftsCount,
            scheduleData: contractWithSchedule?.schedule || []
          };
        })
      );
      
      // Apply status filter if provided
      const filteredContracts = status ? 
        contractsWithShiftCounts.filter(contract => contract.status === status) : 
        contractsWithShiftCounts;
      
      // Apply pagination
      const startIndex = (page - 1) * limit;
      const paginatedContracts = filteredContracts.slice(startIndex, startIndex + limit);
      
      res.json({
        contracts: paginatedContracts,
        pagination: {
          page,
          limit,
          total: filteredContracts.length,
          totalPages: Math.ceil(filteredContracts.length / limit)
        }
      });
    } catch (error) {
      console.error('Failed to fetch contracts:', error);
      res.status(500).json({ message: "Failed to fetch contracts" });
    }
  });

  app.post("/api/contracts", async (req, res) => {
    try {
      const contractData = createContractRequestSchema.parse(req.body);
      
      // Get userId from query params
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      // Validate schedule if seedShifts is true
      const scheduleErrors = contractsService.validateSchedule(contractData.schedule, contractData.seedShifts);
      if (scheduleErrors.length > 0) {
        return res.status(400).json({ 
          message: "Schedule validation failed", 
          errors: scheduleErrors 
        });
      }
      
      // Validate date range
      const dateErrors = contractsService.validateDateRange(contractData.startDate, contractData.endDate);
      if (dateErrors.length > 0) {
        return res.status(400).json({ 
          message: "Date validation failed", 
          errors: dateErrors 
        });
      }
      
      // Start transaction - create contract
      const contract = await storage.createContract({
        name: contractData.name,
        facility: contractData.facility || '',
        role: '', // Default empty role since removed from requirements
        startDate: contractData.startDate,
        endDate: contractData.endDate,
        baseRate: contractData.baseRate,
        otRate: contractData.otRate || null,
        hoursPerWeek: contractData.hoursPerWeek || null,
        status: 'unconfirmed',
        userId: userId
      });
      
      // Always save the schedule days to the database
      await contractsService.upsertScheduleDays(contract.id, contractData.schedule);
      
      // Seed shifts if requested
      let seedResult = null;
      if (contractData.seedShifts) {
        try {
          seedResult = await contractsService.seedShifts(
            contract.id,
            userId,
            contractData.startDate,
            contractData.endDate,
            contractData.schedule
          );
          
          console.log(`Shifts seeded: ${seedResult.created} created, ${seedResult.skipped} skipped`);
        } catch (error) {
          console.error('Failed to seed shifts:', error);
          seedResult = {
            contractId: contract.id,
            totalDays: 0,
            enabledDays: 0,
            created: 0,
            skipped: 0
          };
        }
      }
      
      res.json({
        contract,
        seedResult
      });
    } catch (error) {
      console.error('Failed to create contract:', error);
      res.status(400).json({ message: "Failed to create contract", error: error.message });
    }
  });

  app.put("/api/contracts/:id", async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const updateData = updateContractRequestSchema.parse(req.body);
      
      // Get existing contract with schedule
      const existing = await contractsService.getContractWithSchedule(contractId);
      if (!existing) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Validate schedule if provided
      if (updateData.schedule) {
        const scheduleErrors = contractsService.validateSchedule(
          updateData.schedule, 
          updateData.seedShifts ?? false
        );
        if (scheduleErrors.length > 0) {
          return res.status(400).json({ 
            message: "Schedule validation failed", 
            errors: scheduleErrors 
          });
        }
      }
      
      // Validate date range if provided
      if (updateData.startDate || updateData.endDate) {
        const startDate = updateData.startDate || existing.contract.startDate;
        const endDate = updateData.endDate || existing.contract.endDate;
        const dateErrors = contractsService.validateDateRange(startDate, endDate);
        if (dateErrors.length > 0) {
          return res.status(400).json({ 
            message: "Date validation failed", 
            errors: dateErrors 
          });
        }
      }
      
      // Update contract
      const updatedContract = await storage.updateContract(contractId.toString(), {
        name: updateData.name,
        facility: updateData.facility,
        role: updateData.role,
        status: updateData.status,
        startDate: updateData.startDate,
        endDate: updateData.endDate,
        baseRate: updateData.baseRate,
        otRate: updateData.otRate,
        hoursPerWeek: updateData.hoursPerWeek,
      });
      
      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      let updateResult = { created: 0, updated: 0, deleted: 0 };
      
      if (updateData.schedule) {
        // Update schedule days
        await contractsService.upsertScheduleDays(contractId, updateData.schedule);
        
        // Compute and apply seed actions if schedule or dates changed
        const oldScheduleConfig = {
          defaultStart: existing.schedule.find(s => s.weekday === 0)?.startLocal || '07:00',
          defaultEnd: existing.schedule.find(s => s.weekday === 0)?.endLocal || '19:00',
          days: Object.fromEntries(
            existing.schedule.map(s => [
              s.weekday.toString(),
              { 
                enabled: s.enabled, 
                start: s.startLocal, 
                end: s.endLocal 
              }
            ])
          )
        };
        
        const actions = contractsService.computeSeedActions(
          existing.contract,
          existing.schedule,
          updateData,
          updateData.schedule
        );
        
        console.log('Computed actions:', JSON.stringify(actions, null, 2));
        
        // Ensure actions has the right structure
        if (!actions || typeof actions !== 'object') {
          console.error('computeSeedActions returned invalid object:', actions);
          updateResult = { created: 0, updated: 0, deleted: 0 };
        } else {
          updateResult = await contractsService.applySeedActions(
            contractId,
            existing.contract.userId,
            actions,
            null,
            updateData.schedule
          );
        }
        
        console.log('Update summary:', updateResult);
      }
      
      res.json({
        contract: updatedContract,
        updateResult
      });
    } catch (error) {
      console.error('Failed to update contract:', error);
      res.status(400).json({ message: "Failed to update contract", error: error.message });
    }
  });

  app.patch("/api/contracts/:id/status", async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const { status } = updateContractStatusSchema.parse(req.body);
      
      // Simple status transition validation
      const existing = await contractsService.getContractWithSchedule(contractId);
      if (!existing) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      const currentStatus = existing.contract.status;
      const validTransitions = {
        'unconfirmed': ['active', 'archive'],
        'active': ['archive'],
        'archive': []
      };
      
      if (!validTransitions[currentStatus]?.includes(status)) {
        return res.status(400).json({ 
          message: `Invalid status transition from ${currentStatus} to ${status}` 
        });
      }
      
      const updatedContract = await storage.updateContract(contractId.toString(), { status });
      
      if (!updatedContract) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json(updatedContract);
    } catch (error) {
      console.error('Failed to update contract status:', error);
      res.status(400).json({ message: "Failed to update contract status", error: error.message });
    }
  });

  app.delete("/api/contracts/:id", async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      
      // Check if contract exists
      const existing = await contractsService.getContractWithSchedule(contractId);
      if (!existing) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      // Delete associated shifts first
      await storage.deleteShiftsByContract(contractId.toString());
      
      // Delete contract schedule days
      await contractsService.deleteContractSchedule(contractId);
      
      // Delete the contract
      const deleted = await storage.deleteContract(contractId.toString());
      
      if (!deleted) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json({ message: "Contract deleted successfully" });
    } catch (error) {
      console.error('Failed to delete contract:', error);
      res.status(400).json({ message: "Failed to delete contract", error: error.message });
    }
  });

  // Calendar API - Shift routes with timezone support
  app.get("/api/shifts", async (req, res) => {
    try {
      const query = getShiftsQuerySchema.parse(req.query);
      
      // If no date range provided, get all shifts for user
      if (!query.from || !query.to) {
        const shifts = await storage.getAllShifts(query.userId);
        return res.json(shifts);
      }
      
      // Validate date range
      const rangeErrors = calendarService.validateDateRange(query.from, query.to);
      if (rangeErrors.length > 0) {
        return res.status(400).json({ 
          message: "Invalid date range", 
          errors: rangeErrors 
        });
      }
      
      const shifts = await storage.getShiftsInRange(query.userId, query.from, query.to);
      res.json(shifts);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const shiftRequest = createShiftRequestSchema.parse(req.body);
      const shift = await calendarService.createShift(userId, shiftRequest);
      res.json(shift);
    } catch (error) {
      console.error('Failed to create shift:', error);
      if (error.message.includes('must be between')) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to create shift" });
      }
    }
  });

  app.put("/api/shifts/:id", async (req, res) => {
    try {
      console.log('Shift update request body:', req.body);
      const updates = updateShiftRequestSchema.parse(req.body);
      console.log('Parsed updates:', updates);
      const shift = await calendarService.updateShift(req.params.id, updates);
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      res.json(shift);
    } catch (error) {
      console.error('Failed to update shift:', error);
      if (error.message.includes('must be between')) {
        res.status(409).json({ message: error.message });
      } else {
        res.status(400).json({ message: "Failed to update shift" });
      }
    }
  });

  app.delete("/api/shifts/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteShift(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      res.json({ message: "Shift deleted successfully" });
    } catch (error) {
      console.error('Failed to delete shift:', error);
      res.status(400).json({ message: "Failed to delete shift" });
    }
  });

  app.get("/api/contracts/:id/schedule-preview", async (req, res) => {
    try {
      const contractId = parseInt(req.params.id);
      const date = req.query.date as string;
      
      if (isNaN(contractId)) {
        return res.status(400).json({ message: "Invalid contract ID" });
      }
      
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ message: "Valid date (YYYY-MM-DD) required" });
      }
      
      const preview = await calendarService.getContractSchedulePreview(contractId, date);
      
      if (!preview) {
        return res.status(404).json({ message: "Contract not found" });
      }
      
      res.json(preview);
    } catch (error) {
      console.error('Failed to get schedule preview:', error);
      
      // Handle OUT_OF_RANGE error specifically
      if (error.message === 'OUT_OF_RANGE') {
        return res.status(409).json({ message: "Date is outside contract range" });
      }
      
      res.status(500).json({ message: "Failed to get schedule preview" });
    }
  });

  // Legacy shift routes for backward compatibility
  app.post("/api/shifts/:id/confirm", async (req, res) => {
    try {
      const { actualStart, actualEnd } = req.body;
      const shift = await storage.confirmShiftCompleted(req.params.id, { actualStart, actualEnd });
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      res.json(shift);
    } catch (error) {
      res.status(400).json({ message: "Failed to confirm shift" });
    }
  });

  // Expense routes
  app.get("/api/expenses/totals", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const today = req.query.today as string;
      
      if (!userId) return res.status(400).json({ message: "User ID required" });
      if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
        return res.status(400).json({ message: "Valid today date (YYYY-MM-DD) required" });
      }
      
      // Calculate date ranges with Sunday week start
      const todayDate = new Date(today);
      const todayWeekday = todayDate.getDay(); // 0 = Sunday
      
      // This week (Sunday to Saturday)
      const thisWeekStart = new Date(todayDate);
      thisWeekStart.setDate(todayDate.getDate() - todayWeekday);
      const thisWeekEnd = new Date(thisWeekStart);
      thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
      
      // Next week (Sunday to Saturday)
      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      
      // This month
      const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
      const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
      
      const totals = await storage.getExpensesTotals(
        userId,
        thisWeekStart.toISOString().split('T')[0],
        thisWeekEnd.toISOString().split('T')[0],
        nextWeekStart.toISOString().split('T')[0],
        nextWeekEnd.toISOString().split('T')[0],
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );
      
      res.json(totals);
    } catch (error) {
      console.error('Failed to get expense totals:', error);
      res.status(500).json({ message: "Failed to get expense totals" });
    }
  });

  app.get("/api/expenses", async (req, res) => {
    try {
      const queryData = getExpensesQuerySchema.parse(req.query);
      
      const filters = {
        contractId: req.query.contractId as string,
        category: req.query.category as string,
        startDate: queryData.from,
        endDate: queryData.to,
        limit: queryData.limit,
        offset: queryData.offset,
      };
      
      const [items, total] = await Promise.all([
        storage.listExpenses(queryData.userId, filters),
        storage.getExpensesCount(queryData.userId, filters)
      ]);
      
      res.json({ items, total });
    } catch (error) {
      console.error('Failed to fetch expenses:', error);
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.get("/api/expenses/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const expense = await storage.getExpense(req.params.id);
      
      if (!expense || expense.userId !== userId) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      console.error('Failed to fetch expense:', error);
      res.status(500).json({ message: "Failed to fetch expense" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const requestData = createExpenseRequestSchema.parse(req.body);
      
      // Convert dollars to cents
      const expenseData = {
        contractId: requestData.contractId,
        date: requestData.date,
        description: requestData.description,
        amountCents: Math.round(requestData.amount * 100),
        category: requestData.category,
        note: requestData.note || null,
        isTaxDeductible: requestData.isTaxDeductible || false,
      };
      
      const expense = await storage.createExpense({ ...expenseData, userId });
      res.json(expense);
    } catch (error) {
      console.error('Failed to create expense:', error);
      res.status(400).json({ message: "Failed to create expense" });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      // Check if expense exists and belongs to user
      const existingExpense = await storage.getExpense(req.params.id);
      if (!existingExpense || existingExpense.userId !== userId) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      const requestData = updateExpenseRequestSchema.parse(req.body);
      
      // Convert dollars to cents if amount is provided
      const updates: any = { ...requestData };
      if (requestData.amount !== undefined) {
        updates.amountCents = Math.round(requestData.amount * 100);
        delete updates.amount;
      }
      
      const expense = await storage.updateExpense(req.params.id, updates);
      res.json(expense);
    } catch (error) {
      console.error('Failed to update expense:', error);
      res.status(400).json({ message: "Failed to update expense" });
    }
  });

  app.get("/api/expenses/totals", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const today = req.query.today as string;
      
      if (!userId) return res.status(400).json({ message: "User ID required" });
      if (!today || !/^\d{4}-\d{2}-\d{2}$/.test(today)) {
        return res.status(400).json({ message: "Valid today date (YYYY-MM-DD) required" });
      }
      
      // Calculate date ranges with Sunday week start
      const todayDate = new Date(today);
      const todayWeekday = todayDate.getDay(); // 0 = Sunday
      
      // This week (Sunday to Saturday)
      const thisWeekStart = new Date(todayDate);
      thisWeekStart.setDate(todayDate.getDate() - todayWeekday);
      const thisWeekEnd = new Date(thisWeekStart);
      thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
      
      // Next week (Sunday to Saturday)
      const nextWeekStart = new Date(thisWeekStart);
      nextWeekStart.setDate(thisWeekStart.getDate() + 7);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekStart.getDate() + 6);
      
      // This month
      const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
      const monthEnd = new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0);
      
      const totals = await storage.getExpensesTotals(
        userId,
        thisWeekStart.toISOString().split('T')[0],
        thisWeekEnd.toISOString().split('T')[0],
        nextWeekStart.toISOString().split('T')[0],
        nextWeekEnd.toISOString().split('T')[0],
        monthStart.toISOString().split('T')[0],
        monthEnd.toISOString().split('T')[0]
      );
      
      res.json(totals);
    } catch (error) {
      console.error('Failed to get expense totals:', error);
      res.status(500).json({ message: "Failed to get expense totals" });
    }
  });

  app.get("/api/contracts/active", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const allContracts = await storage.listContracts(userId);
      const activeContracts = allContracts
        .filter(contract => contract.status === 'active')
        .map(contract => ({ id: contract.id, name: contract.name }));
      
      res.json(activeContracts);
    } catch (error) {
      console.error('Failed to fetch active contracts:', error);
      res.status(500).json({ message: "Failed to fetch active contracts" });
    }
  });

  // Dashboard routes
  app.get("/api/dashboard/summary", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const anchor = req.query.anchor as string;
      const anchorDate = anchor ? new Date(anchor) : new Date();

      const { computeSummary } = await import('./services/dashboardLocal');
      const summary = await computeSummary(anchor, userId);
      
      res.json({
        summary,
        anchorDate: anchor || new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      console.error('Dashboard summary error:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard summary' });
    }
  });

  app.get("/api/dashboard/upcoming", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: 'userId is required' });
      }

      const limit = parseInt(req.query.limit as string) || 10;
      
      if (limit < 1 || limit > 50) {
        return res.status(400).json({ error: 'Limit must be between 1 and 50' });
      }

      const { getUpcoming } = await import('./services/dashboardLocal');
      const upcomingShifts = await getUpcoming(limit, userId);
      
      res.json({
        shifts: upcomingShifts,
        limit
      });
    } catch (error) {
      console.error('Dashboard upcoming error:', error);
      res.status(500).json({ error: 'Failed to fetch upcoming shifts' });
    }
  });

  // Feedback routes
  app.get("/api/feedback", async (req, res) => {
    try {
      const feedback = await storage.listFeedback();
      res.json(feedback);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  app.post("/api/feedback", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      const feedbackData = insertFeedbackSchema.parse(req.body);
      const feedback = await storage.createFeedback({ ...feedbackData, userId });
      res.json(feedback);
    } catch (error) {
      res.status(400).json({ message: "Failed to create feedback" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
