import { beforeAll, afterAll, afterEach } from 'vitest';
import { db } from '../server/db';
import { 
  users, dealers, sales, drivers, deliveries, messages, 
  notifications, driverApplications, approvedDriverDealers,
  dealerAdmins, adminInvitations, passwordResetTokens,
  driverStatistics, driverPreferences
} from '../shared/schema';
import { sql } from 'drizzle-orm';

export async function cleanDatabase() {
  await db.delete(messages);
  await db.delete(notifications);
  await db.delete(driverPreferences);
  await db.delete(driverStatistics);
  await db.delete(approvedDriverDealers);
  await db.delete(driverApplications);
  await db.delete(deliveries);
  await db.delete(adminInvitations);
  await db.delete(dealerAdmins);
  await db.delete(sales);
  await db.delete(drivers);
  await db.delete(dealers);
  await db.delete(passwordResetTokens);
  await db.delete(users);
}

beforeAll(async () => {
  await cleanDatabase();
});

afterEach(async () => {
  await cleanDatabase();
});

afterAll(async () => {
  await cleanDatabase();
});
