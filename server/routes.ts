import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

import { insertUserSchema, insertContractSchema, insertShiftSchema, insertExpenseSchema, insertFeedbackSchema, createContractRequestSchema, updateContractRequestSchema, updateContractStatusSchema } from "@shared/schema";
import * as contractsService from "./services/contracts";


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
      
      // Add shift counts to each contract
      const contractsWithShiftCounts = await Promise.all(
        contracts.map(async (contract) => {
          const shiftsCount = await storage.getShiftCountByContract(contract.id);
          return {
            ...contract,
            shiftsCount
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
        timezone: contractData.timezone || 'America/Chicago',
        status: 'unconfirmed',
        userId: userId
      });
      
      // Seed shifts if requested
      let seedResult = null;
      if (contractData.seedShifts) {
        try {
          seedResult = await contractsService.seedShifts(
            contract.id,
            userId,
            contractData.startDate,
            contractData.endDate,
            contractData.timezone || 'America/Chicago',
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
        timezone: updateData.timezone,
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
            updateData.timezone || existing.contract.timezone,
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

  // Shift routes
  app.get("/api/shifts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const filters = {
        month: req.query.month as string,
        contractId: req.query.contractId as string,
      };
      
      const shifts = await storage.listShifts(userId, filters);
      res.json(shifts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch shifts" });
    }
  });

  app.post("/api/shifts", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const shiftData = insertShiftSchema.parse(req.body);
      const shift = await storage.createShift({ ...shiftData, userId });
      res.json(shift);
    } catch (error) {
      res.status(400).json({ message: "Failed to create shift" });
    }
  });

  app.put("/api/shifts/:id", async (req, res) => {
    try {
      const shiftData = insertShiftSchema.partial().parse(req.body);
      const shift = await storage.updateShift(req.params.id, shiftData);
      
      if (!shift) {
        return res.status(404).json({ message: "Shift not found" });
      }
      
      res.json(shift);
    } catch (error) {
      res.status(400).json({ message: "Failed to update shift" });
    }
  });

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
  app.get("/api/expenses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const filters = {
        contractId: req.query.contractId as string,
        category: req.query.category as string,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
      };
      
      const expenses = await storage.listExpenses(userId, filters);
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch expenses" });
    }
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) return res.status(400).json({ message: "User ID required" });
      
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense({ ...expenseData, userId });
      res.json(expense);
    } catch (error) {
      res.status(400).json({ message: "Failed to create expense" });
    }
  });

  app.put("/api/expenses/:id", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateExpense(req.params.id, expenseData);
      
      if (!expense) {
        return res.status(404).json({ message: "Expense not found" });
      }
      
      res.json(expense);
    } catch (error) {
      res.status(400).json({ message: "Failed to update expense" });
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
