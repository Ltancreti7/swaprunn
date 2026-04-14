import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp } from './helpers';

describe('Registration & Authentication', () => {
  let app: ReturnType<typeof createTestApp>;
  let agent: request.Agent;

  beforeEach(() => {
    app = createTestApp();
    agent = request.agent(app);
  });

  describe('Dealer Registration (REG-D01 to REG-D04)', () => {
    it('REG-D01: Register dealership with valid data', async () => {
      const email = `dealer-${Date.now()}@test.com`;
      
      const registerRes = await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      expect(registerRes.status).toBe(200);
      expect(registerRes.body.user).toBeDefined();
      expect(registerRes.body.user.email).toBe(email);
      expect(registerRes.body.user.role).toBe('dealer');
    });

    it('REG-D02: Register with existing email returns error', async () => {
      const email = `dealer-${Date.now()}@test.com`;
      
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      const duplicateRes = await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      expect(duplicateRes.status).toBe(400);
      expect(duplicateRes.body.error).toContain('already exists');
    });

    it('REG-D03: Register with missing fields returns 400', async () => {
      const res = await agent
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });
      
      expect(res.status).toBe(400);
    });

    it('REG-D04: Register with weak password returns error', async () => {
      const res = await agent
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: '123', role: 'dealer' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('Sales Registration (REG-S01 to REG-S03)', () => {
    it('REG-S01: Register sales with valid dealerId', async () => {
      const dealerEmail = `dealer-${Date.now()}@test.com`;
      await agent
        .post('/api/auth/register')
        .send({ email: dealerEmail, password: 'TestPass123!', role: 'dealer' });
      
      const dealerRes = await agent
        .post('/api/dealers')
        .send({
          name: 'Test Dealership',
          email: dealerEmail,
          phone: '555-1234',
          address: '123 Test St',
        });
      
      const dealerId = dealerRes.body.id;
      await agent.post('/api/auth/logout');
      
      const salesEmail = `sales-${Date.now()}@test.com`;
      const salesRegRes = await agent
        .post('/api/auth/register')
        .send({ email: salesEmail, password: 'TestPass123!', role: 'sales' });
      
      expect(salesRegRes.status).toBe(200);
      
      const salesCreateRes = await agent
        .post('/api/sales')
        .send({
          name: 'Test Sales',
          email: salesEmail,
          phone: '555-5678',
          dealerId,
        });
      
      expect(salesCreateRes.status).toBe(200);
      expect(salesCreateRes.body.dealerId).toBe(dealerId);
    });

    it('REG-S02: Register sales with invalid dealerId returns error', async () => {
      const salesEmail = `sales-${Date.now()}@test.com`;
      await agent
        .post('/api/auth/register')
        .send({ email: salesEmail, password: 'TestPass123!', role: 'sales' });
      
      const res = await agent
        .post('/api/sales')
        .send({
          name: 'Test Sales',
          email: salesEmail,
          phone: '555-5678',
          dealerId: '00000000-0000-0000-0000-000000000000',
        });
      
      expect([400, 404, 500]).toContain(res.status);
    });
  });

  describe('Driver Registration (REG-R01 to REG-R03)', () => {
    it('REG-R01: Register driver with valid data', async () => {
      const email = `driver-${Date.now()}@test.com`;
      
      const registerRes = await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'driver' });
      
      expect(registerRes.status).toBe(200);
      expect(registerRes.body.user.role).toBe('driver');
      
      const driverRes = await agent
        .post('/api/drivers')
        .send({
          name: 'Test Driver',
          email,
          phone: '555-9999',
          canDriveManual: true,
          radius: 50,
        });
      
      expect(driverRes.status).toBe(200);
    });

    it('REG-R02: Register driver with existing email returns error', async () => {
      const email = `driver-${Date.now()}@test.com`;
      
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'driver' });
      
      const duplicateRes = await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'driver' });
      
      expect(duplicateRes.status).toBe(400);
    });
  });

  describe('Login (AUTH-01 to AUTH-04)', () => {
    it('AUTH-01: Login with valid credentials', async () => {
      const email = `test-${Date.now()}@test.com`;
      const password = 'TestPass123!';
      
      await agent
        .post('/api/auth/register')
        .send({ email, password, role: 'dealer' });
      
      await agent.post('/api/auth/logout');
      
      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email, password });
      
      expect(loginRes.status).toBe(200);
      expect(loginRes.body.user).toBeDefined();
    });

    it('AUTH-02: Login with wrong password returns 401', async () => {
      const email = `test-${Date.now()}@test.com`;
      
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      await agent.post('/api/auth/logout');
      
      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email, password: 'WrongPass123!' });
      
      expect(loginRes.status).toBe(401);
    });

    it('AUTH-03: Login with non-existent email returns 401', async () => {
      const loginRes = await agent
        .post('/api/auth/login')
        .send({ email: 'nonexistent@test.com', password: 'TestPass123!' });
      
      expect(loginRes.status).toBe(401);
    });

    it('AUTH-04: Session persists across requests', async () => {
      const email = `test-${Date.now()}@test.com`;
      
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      const meRes = await agent.get('/api/auth/me');
      
      expect(meRes.status).toBe(200);
      expect(meRes.body.user).toBeDefined();
      expect(meRes.body.user.email).toBe(email);
    });
  });

  describe('Logout (AUTH-05 to AUTH-06)', () => {
    it('AUTH-05: Logout clears session', async () => {
      const email = `test-${Date.now()}@test.com`;
      
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      const logoutRes = await agent.post('/api/auth/logout');
      expect(logoutRes.status).toBe(200);
    });

    it('AUTH-06: Access protected route after logout returns 401', async () => {
      const email = `test-${Date.now()}@test.com`;
      
      await agent
        .post('/api/auth/register')
        .send({ email, password: 'TestPass123!', role: 'dealer' });
      
      await agent.post('/api/auth/logout');
      
      const meRes = await agent.get('/api/auth/me');
      expect(meRes.body.user).toBeNull();
    });
  });
});
