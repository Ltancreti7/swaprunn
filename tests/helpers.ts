import request from 'supertest';
import express from 'express';
import session from 'express-session';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import bcrypt from 'bcryptjs';

export function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));
  
  app.use(
    session({
      secret: 'test-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false },
    })
  );

  registerRoutes(app, storage);
  return app;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function createTestDealer(agent: request.Agent) {
  const email = `dealer-${Date.now()}@test.com`;
  const password = 'TestPass123!';
  
  await agent
    .post('/api/auth/register')
    .send({ email, password, role: 'dealer' });
  
  const dealerRes = await agent
    .post('/api/dealers')
    .send({
      name: 'Test Dealership',
      email,
      phone: '555-1234',
      address: '123 Test St',
    });
  
  return { email, password, dealer: dealerRes.body };
}

export async function createTestSales(agent: request.Agent, dealerId: string) {
  const email = `sales-${Date.now()}@test.com`;
  const password = 'TestPass123!';
  
  await agent
    .post('/api/auth/register')
    .send({ email, password, role: 'sales' });
  
  const salesRes = await agent
    .post('/api/sales')
    .send({
      name: 'Test Sales',
      email,
      phone: '555-5678',
      dealerId,
    });
  
  return { email, password, sales: salesRes.body };
}

export async function createTestDriver(agent: request.Agent) {
  const email = `driver-${Date.now()}@test.com`;
  const password = 'TestPass123!';
  
  await agent
    .post('/api/auth/register')
    .send({ email, password, role: 'driver' });
  
  const driverRes = await agent
    .post('/api/drivers')
    .send({
      name: 'Test Driver',
      email,
      phone: '555-9999',
      canDriveManual: true,
      radius: 50,
    });
  
  return { email, password, driver: driverRes.body };
}

export async function loginAs(agent: request.Agent, email: string, password: string) {
  const res = await agent
    .post('/api/auth/login')
    .send({ email, password });
  return res;
}

export async function createTestDelivery(agent: request.Agent, dealerId: string, salesId?: string) {
  const res = await agent
    .post('/api/deliveries')
    .send({
      dealerId,
      salesId: salesId || null,
      vin: 'TEST12345678901234',
      pickup: '123 Pickup St',
      dropoff: '456 Dropoff Ave',
      pickupCity: 'Pickup City',
      dropoffCity: 'Dropoff City',
      status: 'pending',
    });
  return res.body;
}
