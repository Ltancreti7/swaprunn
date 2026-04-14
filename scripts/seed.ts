/**
 * SwapRunn Seed Data Script
 * 
 * Creates persistent test accounts that survive smoke test cleanup.
 * These accounts use the prefix "seed-" to identify them.
 * 
 * Default test accounts:
 * - Dealer: seed-dealer@swaprunn.com / TestPass123!
 * - Sales: seed-sales@swaprunn.com / TestPass123!
 * - Driver: seed-driver@swaprunn.com / TestPass123!
 * 
 * Usage: npx tsx scripts/seed.ts
 */

import { db } from '../server/db';
import { storage } from '../server/storage';
import { 
  users, dealers, sales, drivers, 
  driverApplications, approvedDriverDealers
} from '../shared/schema';
import { eq, like } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

const SEED_PREFIX = 'seed-';
const DEFAULT_PASSWORD = 'TestPass123!';

async function clearExistingSeedData() {
  console.log('🧹 Clearing existing seed data...');
  
  const seedUsers = await db.select().from(users).where(like(users.email, `${SEED_PREFIX}%`));
  
  for (const user of seedUsers) {
    if (user.role === 'dealer') {
      const dealer = await db.select().from(dealers).where(eq(dealers.userId, user.id));
      if (dealer[0]) {
        await db.delete(approvedDriverDealers).where(eq(approvedDriverDealers.dealerId, dealer[0].id));
        await db.delete(driverApplications).where(eq(driverApplications.dealerId, dealer[0].id));
        await db.delete(sales).where(eq(sales.dealerId, dealer[0].id));
        await db.delete(dealers).where(eq(dealers.id, dealer[0].id));
      }
    }
    if (user.role === 'driver') {
      const driver = await db.select().from(drivers).where(eq(drivers.userId, user.id));
      if (driver[0]) {
        await db.delete(approvedDriverDealers).where(eq(approvedDriverDealers.driverId, driver[0].id));
        await db.delete(driverApplications).where(eq(driverApplications.driverId, driver[0].id));
        await db.delete(drivers).where(eq(drivers.id, driver[0].id));
      }
    }
    if (user.role === 'sales') {
      await db.delete(sales).where(eq(sales.userId, user.id));
    }
    await db.delete(users).where(eq(users.id, user.id));
  }
  
  console.log(`   Cleared ${seedUsers.length} seed accounts\n`);
}

async function createSeedAccounts() {
  console.log('🌱 Creating seed accounts...\n');
  
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  
  const dealerEmail = `${SEED_PREFIX}dealer@swaprunn.com`;
  const dealerUser = await storage.createUser({
    email: dealerEmail,
    passwordHash,
    role: 'dealer',
  });
  
  const dealer = await storage.createDealer({
    userId: dealerUser.id,
    name: 'McGee Toyota of Claremont',
    email: dealerEmail,
    phone: '603-542-7070',
    address: '175 Charlestown Rd, Claremont, NH 03743',
  });
  
  console.log(`   ✓ Dealer: ${dealerEmail}`);
  console.log(`     Name: McGee Toyota of Claremont`);
  console.log(`     ID: ${dealer.id}\n`);
  
  const salesEmail = `${SEED_PREFIX}sales@swaprunn.com`;
  const salesUser = await storage.createUser({
    email: salesEmail,
    passwordHash,
    role: 'sales',
  });
  
  const salesPerson = await storage.createSales({
    userId: salesUser.id,
    name: 'Demo Salesperson',
    email: salesEmail,
    phone: '555-234-5678',
    dealerId: dealer.id,
  });
  
  console.log(`   ✓ Sales: ${salesEmail}`);
  console.log(`     Name: Demo Salesperson`);
  console.log(`     Dealership: Demo Dealership`);
  console.log(`     ID: ${salesPerson.id}\n`);
  
  const driverEmail = `${SEED_PREFIX}driver@swaprunn.com`;
  const driverUser = await storage.createUser({
    email: driverEmail,
    passwordHash,
    role: 'driver',
  });
  
  const driver = await storage.createDriver({
    userId: driverUser.id,
    name: 'Demo Driver',
    email: driverEmail,
    phone: '555-345-6789',
    canDriveManual: true,
    radius: 75,
    isAvailable: true,
  });
  
  console.log(`   ✓ Driver: ${driverEmail}`);
  console.log(`     Name: Demo Driver`);
  console.log(`     Can Drive Manual: Yes`);
  console.log(`     Radius: 75 miles`);
  console.log(`     ID: ${driver.id}\n`);
  
  const application = await storage.createDriverApplication({
    driverId: driver.id,
    dealerId: dealer.id,
    status: 'approved',
    message: 'Ready to work!',
  });
  
  await storage.createApprovedDriverDealer({
    driverId: driver.id,
    dealerId: dealer.id,
    isVerified: true,
    verifiedAt: new Date(),
  });
  
  console.log(`   ✓ Driver approved and verified for Demo Dealership\n`);
  
  return { dealer, salesPerson, driver };
}

async function runSeed() {
  console.log('\n========================================');
  console.log('  SwapRunn Seed Data Script');
  console.log('========================================\n');
  
  try {
    await clearExistingSeedData();
    const accounts = await createSeedAccounts();
    
    console.log('========================================');
    console.log('  ✅ SEED DATA CREATED SUCCESSFULLY');
    console.log('========================================\n');
    
    console.log('Login credentials (all accounts):');
    console.log(`  Password: ${DEFAULT_PASSWORD}\n`);
    
    console.log('Accounts:');
    console.log('  Dealer:  seed-dealer@swaprunn.com');
    console.log('  Sales:   seed-sales@swaprunn.com');
    console.log('  Driver:  seed-driver@swaprunn.com\n');
    
    console.log('The driver is already approved and verified for the dealership.');
    console.log('You can immediately create deliveries and have the driver accept them.\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed script error:', error);
    process.exit(1);
  }
}

runSeed();
