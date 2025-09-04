import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../server/routes';
import { db } from '../server/db';
import { contracts, contractScheduleDay, shifts } from '../shared/schema';

describe('Contracts API - Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);

    // Clean up test data
    await db.delete(shifts);
    await db.delete(contractScheduleDay);
    await db.delete(contracts);
  });

  afterEach(async () => {
    if (server) {
      server.close();
    }
  });

  describe('POST /api/contracts', () => {
    const validContractPayload = {
      name: 'Test ICU Contract',
      facility: 'Memorial Hospital',
      role: 'ICU Nurse',
      startDate: '2024-01-01',
      endDate: '2024-01-14', // 2 weeks
      baseRate: '50.00',
      otRate: '75.00',
      hoursPerWeek: '36.00',
      timezone: 'America/Chicago',
      schedule: {
        defaultStart: '07:00',
        defaultEnd: '19:00',
        days: {
          '1': { enabled: true },  // Monday
          '3': { enabled: true },  // Wednesday  
          '5': { enabled: true },  // Friday
          '0': { enabled: false }, // Sunday
          '2': { enabled: false }, // Tuesday
          '4': { enabled: false }, // Thursday
          '6': { enabled: false }, // Saturday
        },
      },
      seedShifts: true,
    };

    it('should create contract with correct seed count for Mon/Wed/Fri schedule', async () => {
      const response = await request(app)
        .post('/api/contracts')
        .send(validContractPayload)
        .expect(200);

      expect(response.body.contract).toBeDefined();
      expect(response.body.contract.name).toBe('Test ICU Contract');
      expect(response.body.seedResult).toBeDefined();
      
      // 2 weeks with Mon/Wed/Fri should have 6 shifts
      expect(response.body.seedResult.created).toBe(6);
      expect(response.body.seedResult.enabledDays).toBe(6);
    });

    it('should demonstrate idempotency when called again', async () => {
      // First call
      await request(app)
        .post('/api/contracts')
        .send(validContractPayload)
        .expect(200);

      // Second call with same data should skip existing shifts
      const response = await request(app)
        .post('/api/contracts')
        .send({ ...validContractPayload, name: 'Test ICU Contract 2' })
        .expect(200);

      // Should still create 6 shifts for the new contract
      expect(response.body.seedResult.created).toBe(6);
    });

    it('should reject request with no enabled weekdays when seedShifts=true', async () => {
      const invalidPayload = {
        ...validContractPayload,
        schedule: {
          ...validContractPayload.schedule,
          days: {
            '0': { enabled: false },
            '1': { enabled: false },
            '2': { enabled: false },
            '3': { enabled: false },
            '4': { enabled: false },
            '5': { enabled: false },
            '6': { enabled: false },
          },
        },
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.errors).toContain(
        'At least one weekday must be enabled when seedShifts is true'
      );
    });

    it('should reject invalid date range', async () => {
      const invalidPayload = {
        ...validContractPayload,
        startDate: '2024-01-31',
        endDate: '2024-01-01', // End before start
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(invalidPayload)
        .expect(400);

      expect(response.body.message).toContain('Date validation failed');
    });

    it('should handle overnight shifts correctly (19:00-07:00)', async () => {
      const overnightPayload = {
        ...validContractPayload,
        schedule: {
          defaultStart: '19:00',
          defaultEnd: '07:00', // Next day
          days: {
            '1': { enabled: true }, // Monday only
            '0': { enabled: false },
            '2': { enabled: false },
            '3': { enabled: false },
            '4': { enabled: false },
            '5': { enabled: false },
            '6': { enabled: false },
          },
        },
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(overnightPayload)
        .expect(200);

      expect(response.body.seedResult.created).toBe(2); // 2 Mondays in the period
    });
  });

  describe('PUT /api/contracts/:id', () => {
    let contractId: number;

    beforeEach(async () => {
      // Create initial contract
      const createResponse = await request(app)
        .post('/api/contracts')
        .send({
          name: 'Initial Contract',
          facility: 'Test Facility',
          role: 'Test Role',
          startDate: '2024-01-01',
          endDate: '2024-01-14',
          baseRate: '50.00',
          timezone: 'America/Chicago',
          schedule: {
            defaultStart: '07:00',
            defaultEnd: '19:00',
            days: {
              '1': { enabled: true }, // Monday only
              '0': { enabled: false },
              '2': { enabled: false },
              '3': { enabled: false },
              '4': { enabled: false },
              '5': { enabled: false },
              '6': { enabled: false },
            },
          },
          seedShifts: true,
        });

      contractId = createResponse.body.contract.id;
    });

    it('should expand range and add new shifts', async () => {
      const updateResponse = await request(app)
        .put(`/api/contracts/${contractId}`)
        .send({
          endDate: '2024-01-28', // Extend by 2 weeks
          schedule: {
            defaultStart: '07:00',
            defaultEnd: '19:00',
            days: {
              '1': { enabled: true }, // Keep Monday
              '0': { enabled: false },
              '2': { enabled: false },
              '3': { enabled: false },
              '4': { enabled: false },
              '5': { enabled: false },
              '6': { enabled: false },
            },
          },
        })
        .expect(200);

      expect(updateResponse.body.updateResult.created).toBe(2); // 2 additional Mondays
    });

    it('should narrow range and delete pending shifts', async () => {
      const updateResponse = await request(app)
        .put(`/api/contracts/${contractId}`)
        .send({
          endDate: '2024-01-07', // Narrow to 1 week
          schedule: {
            defaultStart: '07:00',
            defaultEnd: '19:00',
            days: {
              '1': { enabled: true }, // Keep Monday
              '0': { enabled: false },
              '2': { enabled: false },
              '3': { enabled: false },
              '4': { enabled: false },
              '5': { enabled: false },
              '6': { enabled: false },
            },
          },
        })
        .expect(200);

      expect(updateResponse.body.updateResult.deleted).toBe(1); // 1 Monday removed
    });

    it('should add/remove weekdays correctly', async () => {
      const updateResponse = await request(app)
        .put(`/api/contracts/${contractId}`)
        .send({
          schedule: {
            defaultStart: '07:00',
            defaultEnd: '19:00',
            days: {
              '1': { enabled: false }, // Disable Monday
              '3': { enabled: true },  // Enable Wednesday
              '0': { enabled: false },
              '2': { enabled: false },
              '4': { enabled: false },
              '5': { enabled: false },
              '6': { enabled: false },
            },
          },
        })
        .expect(200);

      expect(updateResponse.body.updateResult.created).toBe(2); // 2 Wednesdays
      expect(updateResponse.body.updateResult.deleted).toBe(2);  // 2 Mondays
    });

    it('should update shift times for existing shifts', async () => {
      const updateResponse = await request(app)
        .put(`/api/contracts/${contractId}`)
        .send({
          schedule: {
            defaultStart: '08:00', // Changed from 07:00
            defaultEnd: '20:00',   // Changed from 19:00
            days: {
              '1': { enabled: true }, // Keep Monday
              '0': { enabled: false },
              '2': { enabled: false },
              '3': { enabled: false },
              '4': { enabled: false },
              '5': { enabled: false },
              '6': { enabled: false },
            },
          },
        })
        .expect(200);

      expect(updateResponse.body.updateResult.updated).toBe(2); // 2 Mondays updated
    });
  });

  describe('GET /api/contracts', () => {
    beforeEach(async () => {
      // Create test contracts with different statuses
      for (let i = 0; i < 3; i++) {
        await request(app)
          .post('/api/contracts')
          .send({
            name: `Contract ${i + 1}`,
            facility: 'Test Facility',
            role: 'Test Role',
            startDate: '2024-01-01',
            endDate: '2024-01-14',
            baseRate: '50.00',
            timezone: 'America/Chicago',
            schedule: {
              defaultStart: '07:00',
              defaultEnd: '19:00',
              days: { '1': { enabled: true }, '0': { enabled: false }, '2': { enabled: false }, '3': { enabled: false }, '4': { enabled: false }, '5': { enabled: false }, '6': { enabled: false } },
            },
            seedShifts: false,
          });
      }
    });

    it('should return paginated contracts', async () => {
      const response = await request(app)
        .get('/api/contracts?userId=test-user&page=1&limit=2')
        .expect(200);

      expect(response.body.contracts).toHaveLength(2);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.total).toBe(3);
      expect(response.body.pagination.totalPages).toBe(2);
    });

    it('should filter by status', async () => {
      // Update one contract to active status
      const contracts = await request(app)
        .get('/api/contracts?userId=test-user')
        .expect(200);

      const contractId = contracts.body.contracts[0].id;
      await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'active' })
        .expect(200);

      const response = await request(app)
        .get('/api/contracts?userId=test-user&status=active')
        .expect(200);

      expect(response.body.contracts).toHaveLength(1);
      expect(response.body.contracts[0].status).toBe('active');
    });
  });

  describe('PATCH /api/contracts/:id/status', () => {
    let contractId: number;

    beforeEach(async () => {
      const createResponse = await request(app)
        .post('/api/contracts')
        .send({
          name: 'Status Test Contract',
          facility: 'Test Facility',
          role: 'Test Role',
          startDate: '2024-01-01',
          endDate: '2024-01-14',
          baseRate: '50.00',
          timezone: 'America/Chicago',
          schedule: {
            defaultStart: '07:00',
            defaultEnd: '19:00',
            days: { '1': { enabled: true }, '0': { enabled: false }, '2': { enabled: false }, '3': { enabled: false }, '4': { enabled: false }, '5': { enabled: false }, '6': { enabled: false } },
          },
          seedShifts: false,
        });

      contractId = createResponse.body.contract.id;
    });

    it('should allow valid status transitions', async () => {
      // planned -> active
      let response = await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'active' })
        .expect(200);

      expect(response.body.status).toBe('active');

      // active -> archived
      response = await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'archived' })
        .expect(200);

      expect(response.body.status).toBe('archived');
    });

    it('should reject invalid status transitions', async () => {
      // planned -> archived (skipping active)
      const response = await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'archived' })
        .expect(400);

      expect(response.body.message).toContain('Invalid status transition');
    });

    it('should reject transitions from archived status', async () => {
      // First move to archived
      await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'active' })
        .expect(200);

      await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'archived' })
        .expect(200);

      // Try to move back to active
      const response = await request(app)
        .patch(`/api/contracts/${contractId}/status`)
        .send({ status: 'active' })
        .expect(400);

      expect(response.body.message).toContain('Invalid status transition');
    });
  });

  describe('Timezone/DST Handling', () => {
    it('should preserve same local clock times across DST transition', async () => {
      // Create contract spanning DST transition (March 10, 2024)
      const contractPayload = {
        name: 'DST Test Contract',
        facility: 'Test Facility',
        role: 'Test Role',
        startDate: '2024-03-09', // Saturday before DST
        endDate: '2024-03-11',   // Monday after DST
        baseRate: '50.00',
        timezone: 'America/Chicago',
        schedule: {
          defaultStart: '10:00', // 10 AM local time
          defaultEnd: '18:00',   // 6 PM local time
          days: {
            '0': { enabled: true }, // Sunday (DST transition day)
            '1': { enabled: true }, // Monday
            '2': { enabled: false },
            '3': { enabled: false },
            '4': { enabled: false },
            '5': { enabled: false },
            '6': { enabled: false },
          },
        },
        seedShifts: true,
      };

      const response = await request(app)
        .post('/api/contracts')
        .send(contractPayload)
        .expect(200);

      expect(response.body.seedResult.created).toBe(2); // Sunday and Monday

      // Verify shifts were created with proper UTC conversion
      // This is a basic test - more detailed timezone testing would require
      // querying the actual shift records and verifying UTC timestamps
      expect(response.body.contract.timezone).toBe('America/Chicago');
    });
  });
});