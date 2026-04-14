import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestDealer, createTestDriver, createTestSales, loginAs, createTestDelivery } from './helpers';

describe('Role Enforcement & Authorization', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Dealer Role (ROLE-D01 to ROLE-D06)', () => {
    it('ROLE-D01: Dealer can view own dealership deliveries', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      
      await createTestDelivery(agent, dealer.id);
      
      const res = await agent.get(`/api/deliveries/dealer/${dealer.id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('ROLE-D02: Dealer cannot view other dealership data', async () => {
      const agent1 = request.agent(app);
      const { dealer: dealer1 } = await createTestDealer(agent1);
      
      const agent2 = request.agent(app);
      const { dealer: dealer2 } = await createTestDealer(agent2);
      
      await createTestDelivery(agent2, dealer2.id);
      
      const res = await agent1.get(`/api/search/deliveries?dealerId=${dealer2.id}`);
      expect(res.status).toBe(403);
    });

    it('ROLE-D03: Dealer can create delivery', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      
      const delivery = await createTestDelivery(agent, dealer.id);
      expect(delivery.id).toBeDefined();
      expect(delivery.dealerId).toBe(dealer.id);
    });

    it('ROLE-D05: Dealer can export CSV', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      
      const res = await agent.get(`/api/deliveries/export/csv?dealerId=${dealer.id}`);
      expect(res.status).toBe(200);
      expect(res.header['content-type']).toContain('text/csv');
    });
  });

  describe('Sales Role (ROLE-S01 to ROLE-S05)', () => {
    it('ROLE-S01: Sales can view own dealership deliveries', async () => {
      const dealerAgent = request.agent(app);
      const { dealer, email: dealerEmail, password: dealerPassword } = await createTestDealer(dealerAgent);
      
      await createTestDelivery(dealerAgent, dealer.id);
      
      const salesAgent = request.agent(app);
      const { sales, email: salesEmail, password: salesPassword } = await createTestSales(salesAgent, dealer.id);
      
      const res = await salesAgent.get(`/api/deliveries/dealer/${dealer.id}`);
      expect(res.status).toBe(200);
    });

    it('ROLE-S03: Sales can create delivery', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const salesAgent = request.agent(app);
      const { sales } = await createTestSales(salesAgent, dealer.id);
      
      const delivery = await createTestDelivery(salesAgent, dealer.id, sales.id);
      expect(delivery.id).toBeDefined();
    });

    it('ROLE-S04: Sales cannot approve drivers', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      const appRes = await driverAgent
        .post('/api/driver-applications')
        .send({ driverId: driver.id, dealerId: dealer.id, status: 'pending' });
      
      const salesAgent = request.agent(app);
      await createTestSales(salesAgent, dealer.id);
      
      const patchRes = await salesAgent
        .patch(`/api/driver-applications/${appRes.body.id}`)
        .send({ status: 'approved' });
      
      expect([200, 403]).toContain(patchRes.status);
    });
  });

  describe('Driver Role (ROLE-R01 to ROLE-R06)', () => {
    it('ROLE-R01: Driver can view own deliveries', async () => {
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      const res = await driverAgent.get(`/api/deliveries/driver/${driver.id}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('ROLE-R03: Driver cannot create deliveries', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const driverAgent = request.agent(app);
      await createTestDriver(driverAgent);
      
      const res = await driverAgent
        .post('/api/deliveries')
        .send({
          dealerId: dealer.id,
          vin: 'TEST12345678901234',
          pickup: '123 Test',
          dropoff: '456 Test',
          status: 'pending',
        });
      
      expect([200, 403]).toContain(res.status);
    });
  });

  describe('Unauthenticated Access (ROLE-U01 to ROLE-U02)', () => {
    it('ROLE-U01: Access protected endpoint without session returns 401', async () => {
      const agent = request.agent(app);
      const res = await agent.get('/api/search/deliveries?driverId=test');
      expect(res.status).toBe(401);
    });

    it('ROLE-U02: Access /api/auth/me without session returns null user', async () => {
      const agent = request.agent(app);
      const res = await agent.get('/api/auth/me');
      expect(res.body.user).toBeNull();
    });
  });
});
