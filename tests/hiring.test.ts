import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestDealer, createTestDriver } from './helpers';

describe('Driver Hiring Flow', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Driver Applications (HIRE-01 to HIRE-05)', () => {
    it('HIRE-01: Driver applies to dealership', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      const res = await driverAgent
        .post('/api/driver-applications')
        .send({
          driverId: driver.id,
          dealerId: dealer.id,
          status: 'pending',
          message: 'I would like to work with your dealership',
        });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
      expect(res.body.driverId).toBe(driver.id);
      expect(res.body.dealerId).toBe(dealer.id);
    });

    it('HIRE-03: Dealer views applications', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      await driverAgent
        .post('/api/driver-applications')
        .send({
          driverId: driver.id,
          dealerId: dealer.id,
          status: 'pending',
        });
      
      const res = await dealerAgent.get(`/api/driver-applications/dealer/${dealer.id}`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(0);
    });

    it('HIRE-04: Dealer approves application', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      const appRes = await driverAgent
        .post('/api/driver-applications')
        .send({
          driverId: driver.id,
          dealerId: dealer.id,
          status: 'pending',
        });
      
      const patchRes = await dealerAgent
        .patch(`/api/driver-applications/${appRes.body.id}`)
        .send({ status: 'approved' });
      
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('approved');
    });

    it('HIRE-05: Dealer rejects application', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      const appRes = await driverAgent
        .post('/api/driver-applications')
        .send({
          driverId: driver.id,
          dealerId: dealer.id,
          status: 'pending',
        });
      
      const patchRes = await dealerAgent
        .patch(`/api/driver-applications/${appRes.body.id}`)
        .send({ status: 'rejected' });
      
      expect(patchRes.status).toBe(200);
      expect(patchRes.body.status).toBe('rejected');
    });
  });
});
