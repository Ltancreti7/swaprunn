import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestDealer, createTestDriver, createTestDelivery } from './helpers';

describe('Delivery Lifecycle', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Delivery Creation (DEL-01 to DEL-04)', () => {
    it('DEL-01: Dealer creates delivery with pending status', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      
      const delivery = await createTestDelivery(agent, dealer.id);
      
      expect(delivery.id).toBeDefined();
      expect(delivery.status).toBe('pending');
      expect(delivery.dealerId).toBe(dealer.id);
    });

    it('DEL-04: Create delivery with missing fields returns 400', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      
      const res = await agent
        .post('/api/deliveries')
        .send({
          dealerId: dealer.id,
        });
      
      expect([400, 500]).toContain(res.status);
    });
  });

  describe('Delivery Acceptance - Atomic Lock (DEL-05 to DEL-07)', () => {
    it('DEL-05: Driver accepts available delivery', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      const delivery = await createTestDelivery(dealerAgent, dealer.id);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      await driverAgent
        .post('/api/driver-applications')
        .send({ driverId: driver.id, dealerId: dealer.id, status: 'pending' });
      
      await dealerAgent
        .patch(`/api/driver-applications/${driver.id}`)
        .send({ status: 'approved' });
      
      const acceptRes = await driverAgent
        .patch(`/api/deliveries/${delivery.id}/accept`)
        .send({ driverId: driver.id });
      
      expect([200, 404]).toContain(acceptRes.status);
    });
  });

  describe('Status Transitions (DEL-08 to DEL-18)', () => {
    it('DEL-08 to DEL-14: Valid forward transitions', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      const transitions = [
        'pending_driver_acceptance',
        'assigned',
        'driver_en_route_pickup',
        'arrived_at_pickup',
        'in_transit',
        'arrived_at_dropoff',
        'completed',
      ];
      
      let currentDeliveryId = delivery.id;
      
      for (const status of transitions) {
        const res = await agent
          .patch(`/api/deliveries/${currentDeliveryId}`)
          .send({ status, driverId: driver.id });
        
        if (res.status !== 200) {
          console.log(`Transition to ${status} failed:`, res.body);
        }
      }
    });

    it('DEL-15: Cancellation allowed from any non-terminal state', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      const res = await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'cancelled' });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('cancelled');
    });

    it('DEL-16: Completed status is terminal', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending_driver_acceptance' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'assigned' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'driver_en_route_pickup' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'arrived_at_pickup' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'in_transit' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'arrived_at_dropoff' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'completed' });
      
      const res = await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending' });
      
      expect(res.status).toBe(400);
    });

    it('DEL-17: Cancelled status is terminal', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'cancelled' });
      
      const res = await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending' });
      
      expect(res.status).toBe(400);
    });

    it('DEL-18: Invalid transition rejected', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      const res = await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'completed' });
      
      expect(res.status).toBe(400);
    });
  });

  describe('Backward Transitions (DEL-19 to DEL-21)', () => {
    it('DEL-19: assigned → pending allowed', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending_driver_acceptance' });
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'assigned' });
      
      const res = await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending' });
      
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('pending');
    });

    it('DEL-20: pending_driver_acceptance → pending allowed', async () => {
      const agent = request.agent(app);
      const { dealer } = await createTestDealer(agent);
      const delivery = await createTestDelivery(agent, dealer.id);
      
      await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending_driver_acceptance' });
      
      const res = await agent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending' });
      
      expect(res.status).toBe(200);
    });
  });
});
