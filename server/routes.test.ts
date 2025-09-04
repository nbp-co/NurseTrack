import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import type { Shift, Contract } from '@shared/schema';

// Mock the storage and services
const mockStorage = {
  getShiftsInRange: jest.fn(),
  createShiftWithTimezone: jest.fn(),
  listContracts: jest.fn(),
  getContract: jest.fn(),
  getShiftCountByContract: jest.fn(),
};

const mockContractsService = {
  getSchedulePreview: jest.fn(),
};

jest.mock('./storage', () => ({
  storage: mockStorage,
}));

jest.mock('./services/contracts', () => mockContractsService);

import { registerRoutes } from './routes';

const app = express();
app.use(express.json());

describe('API Routes Tests', () => {
  beforeAll(async () => {
    await registerRoutes(app);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/shifts', () => {
    it('includes contract_seed in source field', async () => {
      const mockShifts: Shift[] = [
        {
          id: 1,
          userId: 1,
          localDate: '2024-09-15',
          startUtc: '2024-09-15T12:00:00.000Z',
          endUtc: '2024-09-15T20:00:00.000Z',
          facility: 'General Hospital',
          contractId: 1,
          status: 'active',
          source: 'contract_seed',
          timezone: 'America/Chicago',
          notes: null,
          createdAt: '2024-09-01T10:00:00.000Z',
          updatedAt: '2024-09-01T10:00:00.000Z'
        },
        {
          id: 2,
          userId: 1,
          localDate: '2024-09-16',
          startUtc: '2024-09-16T13:00:00.000Z',
          endUtc: '2024-09-16T21:00:00.000Z',
          facility: 'City Clinic',
          contractId: null,
          status: 'active',
          source: 'manual',
          timezone: 'America/Chicago',
          notes: 'Manual entry',
          createdAt: '2024-09-01T11:00:00.000Z',
          updatedAt: '2024-09-01T11:00:00.000Z'
        }
      ];

      mockStorage.getShiftsInRange.mockResolvedValue(mockShifts);

      const response = await request(app)
        .get('/api/shifts')
        .query({ userId: '1', from: '2024-09-01', to: '2024-09-30' })
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(response.body[0].source).toBe('contract_seed');
      expect(response.body[1].source).toBe('manual');
      expect(mockStorage.getShiftsInRange).toHaveBeenCalledWith(
        userId: 1,
        from: '2024-09-01',
        to: '2024-09-30'
      });
    });

    it('includes contract fields (timezone, baseRate) when contract present', async () => {
      const mockContracts: Contract[] = [
        {
          id: 1,
          userId: 1,
          name: 'General Hospital Contract',
          facility: 'General Hospital',
          contactName: 'Jane Smith',
          contactPhone: '555-0123',
          contactEmail: 'jane@generalhospital.com',
          address: '123 Medical Center Dr',
          notes: 'Primary contract',
          baseRate: '45.00',
          bonusRate: null,
          startDate: '2024-09-01',
          endDate: '2024-12-31',
          timezone: 'America/Chicago',
          status: 'active',
          schedule: {
            sunday: { enabled: false, start: '07:00', end: '19:00' },
            monday: { enabled: true, start: '07:00', end: '19:00' },
            tuesday: { enabled: true, start: '07:00', end: '19:00' },
            wednesday: { enabled: true, start: '07:00', end: '19:00' },
            thursday: { enabled: true, start: '07:00', end: '19:00' },
            friday: { enabled: true, start: '07:00', end: '19:00' },
            saturday: { enabled: false, start: '07:00', end: '19:00' }
          },
          source: 'manual',
          createdAt: '2024-09-01T10:00:00.000Z',
          updatedAt: '2024-09-01T10:00:00.000Z'
        }
      ];

      const mockShifts: Shift[] = [
        {
          id: 1,
          userId: 1,
          localDate: '2024-09-15',
          startUtc: '2024-09-15T12:00:00.000Z',
          endUtc: '2024-09-15T20:00:00.000Z',
          facility: 'General Hospital',
          contractId: 1,
          status: 'active',
          source: 'contract_seed',
          timezone: 'America/Chicago',
          notes: null,
          createdAt: '2024-09-01T10:00:00.000Z',
          updatedAt: '2024-09-01T10:00:00.000Z'
        }
      ];

      mockStorage.getShiftsInRange.mockResolvedValue(mockShifts);
      mockStorage.listContracts.mockResolvedValue(mockContracts);

      const response = await request(app)
        .get('/api/shifts')
        .query({ userId: '1', from: '2024-09-01', to: '2024-09-30' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        contractId: 1,
        timezone: 'America/Chicago',
        facility: 'General Hospital'
      });
    });

    it('filters by source parameter', async () => {
      const mockShifts: Shift[] = [
        {
          id: 1,
          userId: 1,
          localDate: '2024-09-15',
          startUtc: '2024-09-15T12:00:00.000Z',
          endUtc: '2024-09-15T20:00:00.000Z',
          facility: 'General Hospital',
          contractId: 1,
          status: 'active',
          source: 'contract_seed',
          timezone: 'America/Chicago',
          notes: null,
          createdAt: '2024-09-01T10:00:00.000Z',
          updatedAt: '2024-09-01T10:00:00.000Z'
        }
      ];

      mockStorage.getShiftsInRange.mockResolvedValue(mockShifts);

      const response = await request(app)
        .get('/api/shifts')
        .query({ userId: '1', source: 'contract_seed' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].source).toBe('contract_seed');
      expect(mockStorage.getShiftsInRange).toHaveBeenCalledWith(
        userId: 1,
        source: 'contract_seed'
      });
    });
  });

  describe('GET /api/contracts/:id/schedule-preview', () => {
    it('returns schedule preview with overrides', async () => {
      const mockPreview = {
        enabled: true,
        start: '07:00',
        end: '19:00',
        timezone: 'America/Chicago'
      };

      mockContractsService.getSchedulePreview.mockResolvedValue(mockPreview);

      const response = await request(app)
        .get('/api/contracts/1/schedule-preview')
        .query({ date: '2024-09-15' })
        .expect(200);

      expect(response.body).toEqual(mockPreview);
      expect(mockContractsService.getSchedulePreview).toHaveBeenCalledWith(1, '2024-09-15');
    });

    it('returns 409 OUT_OF_RANGE when date is invalid', async () => {
      const outOfRangeError = new Error('Date is outside contract range');
      outOfRangeError.name = 'OUT_OF_RANGE';

      mockContractsService.getSchedulePreview.mockRejectedValue(outOfRangeError);

      const response = await request(app)
        .get('/api/contracts/1/schedule-preview')
        .query({ date: '2025-01-15' })
        .expect(409);

      expect(response.body).toEqual({
        error: 'OUT_OF_RANGE',
        message: 'Date is outside contract range'
      });
    });

    it('returns 400 when date parameter is missing', async () => {
      const response = await request(app)
        .get('/api/contracts/1/schedule-preview')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Date parameter is required'
      });
    });

    it('returns 404 when contract not found', async () => {
      const notFoundError = new Error('Contract not found');
      notFoundError.name = 'NOT_FOUND';

      mockContractsService.getSchedulePreview.mockRejectedValue(notFoundError);

      const response = await request(app)
        .get('/api/contracts/999/schedule-preview')
        .query({ date: '2024-09-15' })
        .expect(404);

      expect(response.body).toEqual({
        error: 'Contract not found'
      });
    });
  });

  describe('POST /api/shifts', () => {
    it('creates shift with proper validation', async () => {
      const newShift: Partial<Shift> = {
        localDate: '2024-09-15',
        startUtc: '2024-09-15T12:00:00.000Z',
        endUtc: '2024-09-15T20:00:00.000Z',
        facility: 'General Hospital',
        contractId: 1,
        timezone: 'America/Chicago',
        notes: 'Test shift'
      };

      const createdShift: Shift = {
        id: 1,
        userId: 1,
        ...newShift,
        status: 'active',
        source: 'manual',
        createdAt: '2024-09-15T10:00:00.000Z',
        updatedAt: '2024-09-15T10:00:00.000Z'
      } as Shift;

      mockStorage.createShiftWithTimezone.mockResolvedValue(createdShift);

      const response = await request(app)
        .post('/api/shifts')
        .send(newShift)
        .expect(201);

      expect(response.body).toEqual(createdShift);
      expect(mockStorage.createShift).toHaveBeenCalledWith(expect.objectContaining({
        ...newShift,
        userId: 1
      }));
    });

    it('validates required fields', async () => {
      const invalidShift = {
        localDate: '2024-09-15'
        // missing required fields
      };

      const response = await request(app)
        .post('/api/shifts')
        .send(invalidShift)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Overlap Detection', () => {
    it('returns existing shifts for overlap checking', async () => {
      const existingShifts: Shift[] = [
        {
          id: 1,
          userId: 1,
          localDate: '2024-09-15',
          startUtc: '2024-09-15T14:00:00.000Z',
          endUtc: '2024-09-15T22:00:00.000Z',
          facility: 'Existing Hospital',
          contractId: null,
          status: 'active',
          source: 'manual',
          timezone: 'America/Chicago',
          notes: null,
          createdAt: '2024-09-01T10:00:00.000Z',
          updatedAt: '2024-09-01T10:00:00.000Z'
        }
      ];

      mockStorage.getShifts.mockResolvedValue(existingShifts);

      const response = await request(app)
        .get('/api/shifts')
        .query({ userId: '1', date: '2024-09-15' })
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        facility: 'Existing Hospital',
        startUtc: '2024-09-15T14:00:00.000Z',
        endUtc: '2024-09-15T22:00:00.000Z'
      });
    });
  });
});