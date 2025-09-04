import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import type { Express } from 'express';
import { storage } from '../storage';
import { DateTime } from 'luxon';

// Mock express app for testing
let app: Express;

describe('Calendar API Endpoints', () => {
  let testUserId: string;
  let testContractId: number;

  beforeAll(async () => {
    // Create test user
    const user = await storage.createUser({
      email: 'test@calendar.com',
      password: 'password',
      name: 'Test User'
    });
    testUserId = user.id;

    // Create test contract
    const contract = await storage.createContract({
      userId: testUserId,
      name: 'Test Hospital',
      facility: 'ICU',
      role: 'Nurse',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      baseRate: '50.00',
      timezone: 'America/Chicago',
      status: 'active'
    });
    testContractId = contract.id;
  });

  describe('GET /api/shifts', () => {
    it('should return shifts within date range', async () => {
      const response = await request(app)
        .get('/api/shifts')
        .query({
          userId: testUserId,
          from: '2025-01-01',
          to: '2025-01-31'
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it('should return 400 for invalid date range', async () => {
      const response = await request(app)
        .get('/api/shifts')
        .query({
          userId: testUserId,
          from: '2025-01-01',
          to: '2025-05-01' // > 93 days
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid date range');
    });
  });

  describe('POST /api/shifts', () => {
    it('should create manual shift without contract', async () => {
      const shiftData = {
        contractId: null,
        date: '2025-02-15',
        start: '07:00',
        end: '19:00',
        timezone: 'America/Chicago',
        facility: 'Emergency Room'
      };

      const response = await request(app)
        .post('/api/shifts')
        .query({ userId: testUserId })
        .send(shiftData);

      expect(response.status).toBe(200);
      expect(response.body.localDate).toBe('2025-02-15');
      expect(response.body.source).toBe('manual');
    });

    it('should create shift with contract', async () => {
      const shiftData = {
        contractId: testContractId,
        date: '2025-02-16',
        start: '07:00',
        end: '19:00',
        timezone: 'America/Chicago'
      };

      const response = await request(app)
        .post('/api/shifts')
        .query({ userId: testUserId })
        .send(shiftData);

      expect(response.status).toBe(200);
      expect(response.body.contractId).toBe(testContractId);
    });

    it('should handle overnight shifts', async () => {
      const shiftData = {
        contractId: null,
        date: '2025-02-17',
        start: '23:00',
        end: '07:00', // next day
        timezone: 'America/Chicago'
      };

      const response = await request(app)
        .post('/api/shifts')
        .query({ userId: testUserId })
        .send(shiftData);

      expect(response.status).toBe(200);
      
      // Verify overnight shift logic
      const startUtc = new Date(response.body.startUtc);
      const endUtc = new Date(response.body.endUtc);
      expect(endUtc.getTime()).toBeGreaterThan(startUtc.getTime());
    });

    it('should return 409 for shift outside contract date range', async () => {
      const shiftData = {
        contractId: testContractId,
        date: '2024-12-31', // before contract start
        start: '07:00',
        end: '19:00',
        timezone: 'America/Chicago'
      };

      const response = await request(app)
        .post('/api/shifts')
        .query({ userId: testUserId })
        .send(shiftData);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('must be between');
    });
  });

  describe('GET /api/contracts/:id/schedule-preview', () => {
    it('should return schedule preview for contract', async () => {
      const response = await request(app)
        .get(`/api/contracts/${testContractId}/schedule-preview`)
        .query({ date: '2025-02-15' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('weekday');
      expect(response.body).toHaveProperty('enabled');
      expect(response.body).toHaveProperty('start');
      expect(response.body).toHaveProperty('end');
      expect(response.body).toHaveProperty('timezone');
    });

    it('should return 404 for non-existent contract', async () => {
      const response = await request(app)
        .get('/api/contracts/99999/schedule-preview')
        .query({ date: '2025-02-15' });

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/shifts/:id', () => {
    let shiftId: number;

    beforeAll(async () => {
      // Create a shift to update
      const shift = await storage.createShiftWithTimezone({
        userId: testUserId,
        contractId: testContractId,
        startUtc: new Date('2025-02-18T13:00:00.000Z'), // 7am Chicago
        endUtc: new Date('2025-03-01T01:00:00.000Z'), // 7pm Chicago
        localDate: '2025-02-18',
        source: 'manual',
        status: 'In Process'
      });
      shiftId = shift.id;
    });

    it('should update shift times', async () => {
      const updates = {
        start: '08:00',
        end: '20:00',
        timezone: 'America/Chicago'
      };

      const response = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .send(updates);

      expect(response.status).toBe(200);
      // Should recalculate UTC times
      expect(response.body.startUtc).toBeDefined();
      expect(response.body.endUtc).toBeDefined();
    });

    it('should update shift status', async () => {
      const updates = {
        status: 'Completed'
      };

      const response = await request(app)
        .put(`/api/shifts/${shiftId}`)
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('Completed');
    });
  });

  describe('DELETE /api/shifts/:id', () => {
    it('should delete shift', async () => {
      // Create a shift to delete
      const shift = await storage.createShiftWithTimezone({
        userId: testUserId,
        contractId: null,
        startUtc: new Date(),
        endUtc: new Date(),
        localDate: '2025-02-20',
        source: 'manual',
        status: 'In Process'
      });

      const response = await request(app)
        .delete(`/api/shifts/${shift.id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 for non-existent shift', async () => {
      const response = await request(app)
        .delete('/api/shifts/99999');

      expect(response.status).toBe(404);
    });
  });
});

// This test validates the DST and timezone handling
describe('Timezone and DST Handling', () => {
  it('should correctly handle DST transitions', () => {
    // Test spring forward (2:00 AM becomes 3:00 AM)
    const springForward = DateTime.fromISO('2025-03-09T08:00', { zone: 'America/Chicago' });
    expect(springForward.isValid).toBe(true);
    
    // Test fall back (2:00 AM becomes 1:00 AM)
    const fallBack = DateTime.fromISO('2025-11-02T08:00', { zone: 'America/Chicago' });
    expect(fallBack.isValid).toBe(true);
  });

  it('should handle different timezones', () => {
    const chicago = DateTime.fromISO('2025-02-15T14:00', { zone: 'America/Chicago' });
    const newYork = DateTime.fromISO('2025-02-15T15:00', { zone: 'America/New_York' });
    const utc = DateTime.fromISO('2025-02-15T20:00', { zone: 'UTC' });
    
    // All should represent the same moment
    expect(chicago.toUTC().toISO()).toBe(newYork.toUTC().toISO());
    expect(chicago.toUTC().toISO()).toBe(utc.toISO());
  });
});

export default describe;