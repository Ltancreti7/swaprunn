import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createTestApp, createTestDealer, createTestDriver, createTestDelivery } from './helpers';

describe('Chat / Messaging', () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Message Creation (MSG-01 to MSG-03)', () => {
    it('MSG-01: Send message on delivery', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      const delivery = await createTestDelivery(dealerAgent, dealer.id);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      await dealerAgent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending_driver_acceptance' });
      await dealerAgent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'assigned', driverId: driver.id });
      
      const msgRes = await dealerAgent
        .post('/api/messages')
        .send({
          deliveryId: delivery.id,
          senderId: dealer.id,
          senderType: 'dealer',
          receiverId: driver.id,
          receiverType: 'driver',
          content: 'Hello driver!',
        });
      
      expect(msgRes.status).toBe(200);
      expect(msgRes.body.content).toBe('Hello driver!');
    });

    it('MSG-03: Send empty message returns error', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      const delivery = await createTestDelivery(dealerAgent, dealer.id);
      
      const msgRes = await dealerAgent
        .post('/api/messages')
        .send({
          deliveryId: delivery.id,
          senderId: dealer.id,
          senderType: 'dealer',
          receiverId: 'some-id',
          receiverType: 'driver',
          content: '',
        });
      
      expect([400, 500]).toContain(msgRes.status);
    });
  });

  describe('Message Retrieval (MSG-04 to MSG-05)', () => {
    it('MSG-04: Get messages for delivery', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      const delivery = await createTestDelivery(dealerAgent, dealer.id);
      
      const driverAgent = request.agent(app);
      const { driver } = await createTestDriver(driverAgent);
      
      await dealerAgent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'pending_driver_acceptance' });
      await dealerAgent
        .patch(`/api/deliveries/${delivery.id}`)
        .send({ status: 'assigned', driverId: driver.id });
      
      await dealerAgent
        .post('/api/messages')
        .send({
          deliveryId: delivery.id,
          senderId: dealer.id,
          senderType: 'dealer',
          receiverId: driver.id,
          receiverType: 'driver',
          content: 'Test message',
        });
      
      const getRes = await dealerAgent.get(`/api/messages/delivery/${delivery.id}`);
      
      expect(getRes.status).toBe(200);
      expect(Array.isArray(getRes.body)).toBe(true);
      expect(getRes.body.length).toBeGreaterThan(0);
    });
  });

  describe('Conversations (MSG-06 to MSG-07)', () => {
    it('MSG-06: List user conversations', async () => {
      const dealerAgent = request.agent(app);
      const { dealer } = await createTestDealer(dealerAgent);
      
      const res = await dealerAgent.get(`/api/conversations/${dealer.id}?role=dealer`);
      
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
