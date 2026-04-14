import type { Express } from "express";
import { storage } from "./storage";
import { db } from "./db";
import * as schema from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { 
  sendPasswordResetEmail, 
  sendAdminInvitationEmail, 
  isEmailConfigured
} from "./email";
import { pollingRateLimiter, sensitiveRateLimiter, authRateLimiter } from "./rateLimit";
import { 
  notifyDeliveryStatusChange, 
  notifyNewMessage, 
  notifyDriverApplication, 
  notifyApplicationDecision,
  notifyNewDeliveryAvailable,
  notifyDriverAccepted
} from "./pushService";
import { calculateRoundTripEstimate, calculateEstimatedPay } from "./distance";

// Note: Request body normalization (snake_case -> camelCase + date conversion) is handled by global middleware in index.ts

// Validation schemas - use .nullable().optional() for fields where frontend may send null
const createDeliverySchema = z.object({
  dealerId: z.string().uuid(),
  pickup: z.string().min(1, "Pickup address is required"),
  dropoff: z.string().min(1, "Dropoff address is required"),
  vin: z.string().min(1, "VIN is required"),
  notes: z.string().nullable().optional(),
  salesId: z.string().uuid().nullable().optional(),
  driverId: z.string().uuid().nullable().optional(),
  pickupStreet: z.string().nullable().optional(),
  pickupCity: z.string().nullable().optional(),
  pickupState: z.string().nullable().optional(),
  pickupZip: z.string().nullable().optional(),
  dropoffStreet: z.string().nullable().optional(),
  dropoffCity: z.string().nullable().optional(),
  dropoffState: z.string().nullable().optional(),
  dropoffZip: z.string().nullable().optional(),
  year: z.number().nullable().optional(),
  make: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  transmission: z.string().nullable().optional(),
  serviceType: z.string().nullable().optional(),
  hasTrade: z.boolean().nullable().optional(),
  requiresSecondDriver: z.boolean().nullable().optional(),
  requiredTimeframe: z.string().nullable().optional(),
  customDate: z.string().nullable().optional(),
  scheduledDate: z.string().nullable().optional(),
  scheduledTime: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
});

const updateDeliveryStatusSchema = z.object({
  status: z.enum([
    "pending",
    "pending_driver_acceptance",
    "assigned",
    "driver_en_route_pickup",
    "arrived_at_pickup",
    "in_transit",
    "arrived_at_dropoff",
    "completed",
    "cancelled"
  ]),
});

// Valid delivery status transitions - allows cancellation from any state and safe reversions
const DELIVERY_STATUS_FLOW: Record<string, string[]> = {
  pending: ["pending_driver_acceptance", "assigned", "cancelled"],
  pending_driver_acceptance: ["assigned", "pending", "cancelled"], // Can revert to pending if driver declines
  assigned: ["driver_en_route_pickup", "pending", "cancelled"], // Can revert to pending if driver cancels
  driver_en_route_pickup: ["arrived_at_pickup", "assigned", "cancelled"],
  arrived_at_pickup: ["in_transit", "driver_en_route_pickup", "cancelled"],
  in_transit: ["arrived_at_dropoff", "arrived_at_pickup", "cancelled"],
  arrived_at_dropoff: ["completed", "in_transit", "cancelled"],
  completed: [], // Terminal state
  cancelled: [], // Terminal state
};

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function isDeliveryParticipant(userId: string, delivery: { dealerId: string; driverId: string | null; salesId: string | null }): Promise<boolean> {
  const dealer = await storage.getDealerByUserId(userId);
  if (dealer && dealer.id === delivery.dealerId) {
    return true;
  }
  
  const dealerAdmin = await storage.getDealerAdminByUserId(userId);
  if (dealerAdmin && dealerAdmin.dealerId === delivery.dealerId) {
    return true;
  }
  
  const sales = await storage.getSalesByUserId(userId);
  if (sales && sales.id === delivery.salesId) {
    return true;
  }
  
  const driver = await storage.getDriverByUserId(userId);
  if (driver && driver.id === delivery.driverId) {
    return true;
  }
  
  return false;
}

async function canAccessDealerData(userId: string, dealerId: string): Promise<boolean> {
  const dealer = await storage.getDealerByUserId(userId);
  if (dealer && dealer.id === dealerId) {
    return true;
  }
  
  const dealerAdmin = await storage.getDealerAdminByUserId(userId);
  if (dealerAdmin && dealerAdmin.dealerId === dealerId) {
    return true;
  }
  
  const sales = await storage.getSalesByUserId(userId);
  if (sales && sales.dealerId === dealerId) {
    return true;
  }
  
  return false;
}

export function registerRoutes(app: Express): void {
  // Note: Request body normalization middleware is in index.ts (runs before routes)

  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, role } = req.body;
      const normalizedEmail = email?.toLowerCase().trim();
      
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      const user = await storage.createUser({
        email: normalizedEmail,
        passwordHash: await hashPassword(password),
        role,
      });
      
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Validation schema for dealer registration
  const registerDealerSchema = z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    name: z.string().min(1, "Dealership name is required"),
    address: z.string().optional().default(""),
    phone: z.string().optional().default(""),
  });

  // Combined dealer registration endpoint - creates user and dealer in one atomic request
  // This avoids cross-site cookie issues on production domains
  app.post("/api/auth/register-dealer", async (req, res) => {
    try {
      // Validate request body
      const parseResult = registerDealerSchema.safeParse(req.body);
      if (!parseResult.success) {
        const errorMessage = parseResult.error.issues.map((e: { message: string }) => e.message).join(", ");
        return res.status(400).json({ error: errorMessage });
      }
      
      const { email, password, name, address, phone } = parseResult.data;
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "User already exists" });
      }
      
      // Hash password before transaction
      const passwordHash = await hashPassword(password);
      
      // Use a transaction to ensure atomicity - if any step fails, all are rolled back
      const result = await db.transaction(async (tx) => {
        // Create user with dealer role
        const [user] = await tx.insert(schema.users).values({
          email: normalizedEmail,
          passwordHash,
          role: "dealer",
        }).returning();
        
        // Create the dealer record
        const [dealer] = await tx.insert(schema.dealers).values({
          userId: user.id,
          name,
          address,
          email: normalizedEmail,
          phone,
        }).returning();
        
        // Create dealer admin record (owner)
        await tx.insert(schema.dealerAdmins).values({
          dealerId: dealer.id,
          userId: user.id,
          role: "owner",
          invitedBy: user.id,
        });
        
        return { user, dealer };
      });
      
      // Set session
      (req.session as any).userId = result.user.id;
      (req.session as any).role = result.user.role;
      
      res.json({ 
        user: { id: result.user.id, email: result.user.email, role: result.user.role },
        dealer: result.dealer 
      });
    } catch (error) {
      console.error("Dealer registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", authRateLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email?.toLowerCase().trim();
      
      const user = await storage.getUserByEmail(normalizedEmail);
      if (!user || !await verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      // Check if dealer role user has an approved dealer_admin record
      if (user.role === "dealer") {
        const adminRecords = await db.select().from(schema.dealerAdmins)
          .where(eq(schema.dealerAdmins.userId, user.id));
        
        if (adminRecords.length > 0) {
          // Check if any admin record is approved (or has no status, meaning legacy approved)
          const hasApprovedAccess = adminRecords.some(
            admin => !admin.status || admin.status === "approved"
          );
          
          if (!hasApprovedAccess) {
            return res.status(403).json({ 
              error: "Your admin access request is pending approval. Please wait for an existing admin to approve your request." 
            });
          }
        }
      }
      
      (req.session as any).userId = user.id;
      (req.session as any).role = user.role;
      
      res.json({ user: { id: user.id, email: user.email, role: user.role } });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.json({ user: null });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.json({ user: null });
      }
      
      let profile = null;
      const role = user.role;
      
      if (role === "dealer") {
        profile = await storage.getDealerByUserId(userId);
      } else if (role === "sales") {
        profile = await storage.getSalesByUserId(userId);
      } else if (role === "driver") {
        profile = await storage.getDriverByUserId(userId);
      }
      
      res.json({ 
        user: { id: user.id, email: user.email, role: user.role },
        profile
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ error: "Auth check failed" });
    }
  });

  app.post("/api/auth/forgot-password", sensitiveRateLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      const normalizedEmail = email?.toLowerCase().trim();
      
      const user = await storage.getUserByEmail(normalizedEmail);
      if (user) {
        const { token } = await storage.createPasswordResetToken(user.id);
        const emailSent = await sendPasswordResetEmail(normalizedEmail, token);
        if (!emailSent) {
          console.warn('Password reset email could not be sent - email service not configured');
        }
      }
      
      res.json({ message: "If an account exists with this email, a password reset link has been sent." });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process password reset request" });
    }
  });

  app.post("/api/auth/reset-password", sensitiveRateLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }
      
      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }
      
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const resetToken = await storage.getPasswordResetTokenByHash(tokenHash);
      
      if (!resetToken) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }
      
      const passwordHash = await hashPassword(password);
      await storage.updateUserPassword(resetToken.userId, passwordHash);
      await storage.markPasswordResetTokenUsed(resetToken.id);
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  app.get("/api/auth/email-configured", (_req, res) => {
    res.json({ configured: isEmailConfigured() });
  });

  app.delete("/api/user/account", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const role = (req.session as any)?.role;
      
      if (!userId) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      await storage.deleteUserAccount(userId, role);
      
      req.session.destroy((err) => {
        if (err) {
          console.error("Session destroy error after account deletion:", err);
        }
        res.json({ message: "Account deleted successfully" });
      });
    } catch (error) {
      console.error("Delete account error:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.get("/api/dealers", async (_req, res) => {
    try {
      const dealers = await storage.getDealers();
      res.json(dealers);
    } catch (error) {
      console.error("Get dealers error:", error);
      res.status(500).json({ error: "Failed to get dealers" });
    }
  });

  app.get("/api/dealers/:id", async (req, res) => {
    try {
      const dealer = await storage.getDealer(req.params.id);
      if (!dealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      res.json(dealer);
    } catch (error) {
      console.error("Get dealer error:", error);
      res.status(500).json({ error: "Failed to get dealer" });
    }
  });

  app.post("/api/dealers", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.createDealer({ ...req.body, userId });
      
      await storage.createDealerAdmin({
        dealerId: dealer.id,
        userId,
        role: "owner",
        invitedBy: userId,
      });
      
      res.json(dealer);
    } catch (error) {
      console.error("Create dealer error:", error);
      res.status(500).json({ error: "Failed to create dealer" });
    }
  });

  app.patch("/api/dealers/:id", async (req, res) => {
    try {
      const dealer = await storage.updateDealer(req.params.id, req.body);
      res.json(dealer);
    } catch (error) {
      console.error("Update dealer error:", error);
      res.status(500).json({ error: "Failed to update dealer" });
    }
  });

  app.get("/api/sales", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (!dealer) {
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      const sales = await storage.getSalesByDealerId(dealer.id);
      res.json(sales);
    } catch (error) {
      console.error("Get sales error:", error);
      res.status(500).json({ error: "Failed to get sales" });
    }
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const sales = await storage.createSales({ ...req.body, userId });
      res.json(sales);
    } catch (error) {
      console.error("Create sales error:", error);
      res.status(500).json({ error: "Failed to create sales" });
    }
  });

  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const sales = await storage.updateSales(req.params.id, req.body);
      res.json(sales);
    } catch (error) {
      console.error("Update sales error:", error);
      res.status(500).json({ error: "Failed to update sales" });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    try {
      await storage.deleteSales(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete sales error:", error);
      res.status(500).json({ error: "Failed to delete sales" });
    }
  });

  app.get("/api/dealer/current", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const admin = await storage.getDealerAdminByUserId(userId);
      if (admin) {
        const dealer = await storage.getDealer(admin.dealerId);
        return res.json({ dealer, adminRole: admin.role });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (dealer) {
        return res.json({ dealer, adminRole: 'owner' });
      }
      
      res.status(404).json({ error: "Dealer not found" });
    } catch (error) {
      console.error("Get current dealer error:", error);
      res.status(500).json({ error: "Failed to get dealer" });
    }
  });

  app.get("/api/sales/current", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const sales = await storage.getSalesByUserId(userId);
      if (!sales) {
        return res.status(404).json({ error: "Sales profile not found" });
      }
      
      res.json(sales);
    } catch (error) {
      console.error("Get current sales error:", error);
      res.status(500).json({ error: "Failed to get sales profile" });
    }
  });

  app.get("/api/sales/dealer/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hasAccess = await canAccessDealerData(userId, req.params.dealerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const sales = await storage.getSalesByDealerId(req.params.dealerId);
      res.json(sales);
    } catch (error) {
      console.error("Get sales by dealer error:", error);
      res.status(500).json({ error: "Failed to get sales" });
    }
  });

  app.get("/api/deliveries/sales/:salesId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const sales = await storage.getSales(req.params.salesId);
      if (!sales) {
        return res.status(404).json({ error: "Sales not found" });
      }
      
      const currentSales = await storage.getSalesByUserId(userId);
      const hasAccess = currentSales?.id === req.params.salesId || await canAccessDealerData(userId, sales.dealerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deliveries = await storage.getDeliveriesBySalesId(req.params.salesId);
      res.json(deliveries);
    } catch (error) {
      console.error("Get deliveries by sales error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/drivers/approved/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hasAccess = await canAccessDealerData(userId, req.params.dealerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const approvals = await storage.getApprovedDriversByDealerId(req.params.dealerId);
      const drivers = await Promise.all(
        approvals.map(async (a) => {
          const driver = await storage.getDriver(a.driverId);
          return driver;
        })
      );
      res.json(drivers.filter(Boolean));
    } catch (error) {
      console.error("Get approved drivers error:", error);
      res.status(500).json({ error: "Failed to get approved drivers" });
    }
  });

  app.get("/api/deliveries/dealer/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hasAccess = await canAccessDealerData(userId, req.params.dealerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const deliveries = await storage.getDeliveriesByDealerId(req.params.dealerId);
      res.json(deliveries);
    } catch (error) {
      console.error("Get deliveries by dealer error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/driver-applications/dealer/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hasAccess = await canAccessDealerData(userId, req.params.dealerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const applications = await storage.getDriverApplicationsByDealerId(req.params.dealerId);
      const applicationsWithDrivers = await Promise.all(
        applications.map(async (app) => {
          const driver = await storage.getDriver(app.driverId);
          return { ...app, driver };
        })
      );
      res.json(applicationsWithDrivers.filter(a => a.driver));
    } catch (error) {
      console.error("Get driver applications error:", error);
      res.status(500).json({ error: "Failed to get driver applications" });
    }
  });

  app.get("/api/drivers", async (_req, res) => {
    try {
      const drivers = await storage.getDrivers();
      res.json(drivers);
    } catch (error) {
      console.error("Get drivers error:", error);
      res.status(500).json({ error: "Failed to get drivers" });
    }
  });

  app.get("/api/drivers/current", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.getDriverByUserId(userId);
      if (!driver) {
        return res.status(404).json({ error: "Driver profile not found" });
      }
      
      res.json(driver);
    } catch (error) {
      console.error("Get current driver error:", error);
      res.status(500).json({ error: "Failed to get driver profile" });
    }
  });

  app.get("/api/drivers/my-dealerships", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.getDriverByUserId(userId);
      if (!driver) {
        return res.status(404).json({ error: "Driver profile not found" });
      }
      
      const approvals = await storage.getApprovedDriverDealers(driver.id);
      const dealershipsWithApproval = await Promise.all(
        approvals.map(async (approval) => {
          const dealer = await storage.getDealer(approval.dealerId);
          return dealer ? { ...dealer, approvedAt: approval.approvedAt } : null;
        })
      );
      
      res.json(dealershipsWithApproval.filter(Boolean));
    } catch (error) {
      console.error("Get my dealerships error:", error);
      res.status(500).json({ error: "Failed to get dealerships" });
    }
  });

  app.get("/api/drivers/:id", async (req, res) => {
    try {
      const driver = await storage.getDriver(req.params.id);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }
      res.json(driver);
    } catch (error) {
      console.error("Get driver error:", error);
      res.status(500).json({ error: "Failed to get driver" });
    }
  });

  app.post("/api/drivers", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.createDriver({ ...req.body, userId });
      res.json(driver);
    } catch (error) {
      console.error("Create driver error:", error);
      res.status(500).json({ error: "Failed to create driver" });
    }
  });

  app.patch("/api/drivers/:id", async (req, res) => {
    try {
      const driver = await storage.updateDriver(req.params.id, req.body);
      res.json(driver);
    } catch (error) {
      console.error("Update driver error:", error);
      res.status(500).json({ error: "Failed to update driver" });
    }
  });

  app.delete("/api/drivers/:id", async (req, res) => {
    try {
      await storage.deleteDriver(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete driver error:", error);
      res.status(500).json({ error: "Failed to delete driver" });
    }
  });

  app.get("/api/deliveries/scheduled", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const role = (req.session as any)?.role;
      if (!userId || !role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { year, month } = req.query;
      if (!year || !month) {
        return res.status(400).json({ error: "Year and month are required" });
      }

      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`;

      let deliveries: any[] = [];
      
      if (role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          deliveries = await storage.getDeliveriesByDealerId(dealer.id);
        }
      } else if (role === "sales") {
        const sales = await storage.getSalesByUserId(userId);
        if (sales) {
          deliveries = await storage.getDeliveriesBySalesId(sales.id);
        }
      } else if (role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          deliveries = await storage.getDeliveriesByDriverId(driver.id);
        }
      }

      const scheduledDeliveries = deliveries.filter(d => 
        d.scheduledDate && 
        d.scheduledDate >= startDate && 
        d.scheduledDate < endDate
      );

      const enrichedDeliveries = await Promise.all(scheduledDeliveries.map(async (d) => {
        const [dealer, driver, sales] = await Promise.all([
          d.dealerId ? storage.getDealer(d.dealerId) : null,
          d.driverId ? storage.getDriver(d.driverId) : null,
          d.salesId ? storage.getSales(d.salesId) : null,
        ]);
        return { ...d, dealer, driver, sales };
      }));

      res.json(enrichedDeliveries);
    } catch (error) {
      console.error("Get scheduled deliveries error:", error);
      res.status(500).json({ error: "Failed to get scheduled deliveries" });
    }
  });

  app.get("/api/deliveries", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      let deliveries;
      if (user.role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          deliveries = await storage.getDeliveriesByDealerId(dealer.id);
        }
      } else if (user.role === "sales") {
        const sales = await storage.getSalesByUserId(userId);
        if (sales) {
          deliveries = await storage.getDeliveriesBySalesId(sales.id);
        }
      } else if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          deliveries = await storage.getDeliveriesByDriverId(driver.id);
        }
      }
      
      res.json(deliveries || []);
    } catch (error) {
      console.error("Get deliveries error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/deliveries/:id", async (req, res) => {
    try {
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      res.json(delivery);
    } catch (error) {
      console.error("Get delivery error:", error);
      res.status(500).json({ error: "Failed to get delivery" });
    }
  });

  app.post("/api/deliveries", async (req, res) => {
    try {
      // req.body is already normalized by global middleware in index.ts
      const parseResult = createDeliverySchema.safeParse(req.body);
      if (!parseResult.success) {
        const issues = parseResult.error?.issues || [];
        return res.status(400).json({ 
          error: "Validation failed", 
          details: issues.map((e) => ({ field: String(e.path.join('.')), message: e.message }))
        });
      }
      const delivery = await storage.createDelivery(parseResult.data);
      
      // Calculate distance and pay estimates asynchronously
      const dealer = await storage.getDealer(parseResult.data.dealerId);
      let estimatedPayFormatted: string | undefined;
      
      if (dealer) {
        const estimate = await calculateRoundTripEstimate(
          parseResult.data.pickup,
          parseResult.data.dropoff
        );
        
        if (estimate) {
          const hourlyRate = dealer.hourlyRate || 2500;
          const estimatedPay = calculateEstimatedPay(estimate.durationMinutes, hourlyRate);
          estimatedPayFormatted = `$${(estimatedPay / 100).toFixed(2)}`;
          
          await db.update(schema.deliveries)
            .set({
              estimatedDistanceKm: estimate.distanceKm.toString(),
              estimatedDurationMinutes: estimate.durationMinutes,
              estimatedPayCents: estimatedPay
            })
            .where(eq(schema.deliveries.id, delivery.id));
          
          delivery.estimatedDistanceKm = estimate.distanceKm.toString();
          delivery.estimatedDurationMinutes = estimate.durationMinutes;
          delivery.estimatedPayCents = estimatedPay;
        }
      }
      
      // Send in-app notifications to all approved & verified drivers for this dealership
      try {
        const approvedDriverDealers = await storage.getApprovedDriversByDealerId(parseResult.data.dealerId);
        const verifiedDrivers = approvedDriverDealers.filter(ad => ad.isVerified);
        
        if (verifiedDrivers.length > 0 && dealer) {
          const vehicleInfo = `${parseResult.data.year || ''} ${parseResult.data.make || ''} ${parseResult.data.model || ''}`.trim() || 'Vehicle';
          const payInfo = estimatedPayFormatted ? ` - Est. ${estimatedPayFormatted}` : '';
          
          const driverUserIds: string[] = [];
          
          for (const ad of verifiedDrivers) {
            const driver = await storage.getDriver(ad.driverId);
            if (driver?.userId) {
              driverUserIds.push(driver.userId);
              await storage.createNotification({
                userId: driver.userId,
                deliveryId: delivery.id,
                type: "new_delivery_available",
                title: "New Delivery Available",
                message: `${dealer.name} has a new job: ${vehicleInfo}${payInfo}`,
                read: false,
              });
            }
          }
          
          // Send push notifications to all verified drivers
          if (driverUserIds.length > 0) {
            notifyNewDeliveryAvailable(
              delivery.id,
              vehicleInfo,
              estimatedPayFormatted || 'TBD',
              driverUserIds
            ).catch(err => console.error('Push notification error:', err));
          }
        }
      } catch (notifyError) {
        console.error('Error sending driver notifications:', notifyError);
      }
      
      res.json(delivery);
    } catch (error) {
      console.error("Create delivery error:", error);
      res.status(500).json({ error: "Failed to create delivery" });
    }
  });

  // Granular status update with validation
  app.patch("/api/deliveries/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const parseResult = updateDeliveryStatusSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: "Invalid status value" });
      }

      const delivery = await storage.getDelivery(id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }

      const currentStatus = delivery.status || "pending";
      const newStatus = parseResult.data.status;
      const allowedTransitions = DELIVERY_STATUS_FLOW[currentStatus] || [];

      if (!allowedTransitions.includes(newStatus)) {
        return res.status(400).json({ 
          error: `Cannot transition from '${currentStatus}' to '${newStatus}'`,
          allowedTransitions 
        });
      }

      const updates: any = { status: newStatus };
      
      // Track timestamps for status changes
      if (newStatus === "driver_en_route_pickup") {
        updates.startedAt = new Date();
      } else if (newStatus === "completed") {
        updates.completedAt = new Date();
      } else if (newStatus === "cancelled") {
        updates.cancelledAt = new Date();
        updates.cancelledBy = (req.session as any)?.userId;
      }

      const updatedDelivery = await storage.updateDelivery(id, updates);
      if (!updatedDelivery) {
        return res.status(404).json({ error: "Failed to update delivery" });
      }
      
      // Send push notifications for status changes using the updated delivery
      try {
        const recipientUserIds: string[] = [];
        
        // Notify dealer
        const dealer = await storage.getDealer(updatedDelivery.dealerId);
        if (dealer?.userId) recipientUserIds.push(dealer.userId);
        
        // Notify driver if assigned (use updatedDelivery to capture newly assigned driver)
        if (updatedDelivery.driverId) {
          const driver = await storage.getDriver(updatedDelivery.driverId);
          if (driver?.userId) recipientUserIds.push(driver.userId);
        }
        
        // Notify sales if assigned
        if (updatedDelivery.salesId) {
          const sales = await storage.getSales(updatedDelivery.salesId);
          if (sales?.userId) recipientUserIds.push(sales.userId);
        }
        
        if (recipientUserIds.length > 0) {
          await notifyDeliveryStatusChange(id, newStatus, recipientUserIds);
        }
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }
      
      res.json(updatedDelivery);
    } catch (error) {
      console.error("Update delivery status error:", error);
      res.status(500).json({ error: "Failed to update delivery status" });
    }
  });

  app.patch("/api/deliveries/:id", async (req, res) => {
    try {
      const delivery = await storage.updateDelivery(req.params.id, req.body);
      res.json(delivery);
    } catch (error) {
      console.error("Update delivery error:", error);
      res.status(500).json({ error: "Failed to update delivery" });
    }
  });

  app.get("/api/deliveries/driver/:driverId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.getDriverByUserId(userId);
      if (!driver || driver.id !== req.params.driverId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const { status } = req.query;
      let deliveries = await storage.getDeliveriesByDriverId(req.params.driverId);
      if (status && typeof status === "string") {
        const statuses = status.split(",");
        deliveries = deliveries.filter(d => statuses.includes(d.status || ""));
      }
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (d) => {
          const dealer = await storage.getDealer(d.dealerId);
          const sales = d.salesId ? await storage.getSales(d.salesId) : null;
          return { ...d, dealer, sales: sales ? { name: sales.name } : null };
        })
      );
      res.json(enrichedDeliveries);
    } catch (error) {
      console.error("Get deliveries by driver error:", error);
      res.status(500).json({ error: "Failed to get deliveries" });
    }
  });

  app.get("/api/deliveries/driver/:driverId/requests", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.getDriverByUserId(userId);
      if (!driver || driver.id !== req.params.driverId) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const driverId = req.params.driverId;
      const approvedDealers = await storage.getApprovedDriverDealers(driverId);
      const dealerIds = approvedDealers.map(a => a.dealerId);
      
      if (dealerIds.length === 0) {
        return res.json([]);
      }
      
      const allDeliveries = await Promise.all(
        dealerIds.map(dealerId => storage.getDeliveriesByDealerId(dealerId))
      );
      
      const requests = allDeliveries.flat().filter(d => {
        // Don't show deliveries this driver has already declined
        const declinedList = d.declinedDriverIds || [];
        if (declinedList.includes(driverId)) {
          return false;
        }
        return (d.status === "pending" && !d.driverId) ||
          (d.status === "pending_driver_acceptance" && d.driverId === driverId);
      });
      
      const enrichedRequests = await Promise.all(
        requests.map(async (d) => {
          const dealer = await storage.getDealer(d.dealerId);
          const sales = d.salesId ? await storage.getSales(d.salesId) : null;
          return { ...d, dealer, sales: sales ? { name: sales.name } : null };
        })
      );
      
      res.json(enrichedRequests);
    } catch (error) {
      console.error("Get delivery requests for driver error:", error);
      res.status(500).json({ error: "Failed to get delivery requests" });
    }
  });

  app.get("/api/deliveries/:id/full", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const isParticipant = await isDeliveryParticipant(userId, delivery);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const dealer = await storage.getDealer(delivery.dealerId);
      const sales = delivery.salesId ? await storage.getSales(delivery.salesId) : null;
      res.json({ ...delivery, dealer, sales: sales ? { name: sales.name, userId: sales.userId } : null });
    } catch (error) {
      console.error("Get delivery with relations error:", error);
      res.status(500).json({ error: "Failed to get delivery" });
    }
  });

  app.post("/api/deliveries/:id/accept", async (req, res) => {
    try {
      const { driverId } = req.body;
      
      const delivery = await storage.getDelivery(req.params.id);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const approvals = await storage.getApprovedDriverDealers(driverId);
      const approval = approvals.find(a => a.dealerId === delivery.dealerId);
      
      if (!approval) {
        return res.status(403).json({ error: "Driver is not approved to work for this dealer" });
      }
      
      if (!approval.isVerified) {
        return res.status(403).json({ error: "Driver must be verified by the dealer before accepting deliveries. Please contact the dealer to complete your verification." });
      }
      
      const updatedDelivery = await storage.atomicAcceptDelivery(req.params.id, driverId);
      
      if (!updatedDelivery) {
        return res.status(400).json({ error: "Delivery not available or already accepted by another driver" });
      }
      
      const userId = (req.session as any)?.userId;
      const driver = await storage.getDriver(driverId);
      const dealer = await storage.getDealer(updatedDelivery.dealerId);
      const sales = updatedDelivery.salesId ? await storage.getSales(updatedDelivery.salesId) : null;
      
      const welcomeMessage = `Chat activated! Driver ${driver?.name || "Unknown"} has accepted this delivery. You can now coordinate the pickup schedule and any other details.`;
      const recipientId = sales?.userId || dealer?.userId;
      if (recipientId) {
        await storage.createMessage({
          deliveryId: req.params.id,
          senderId: userId,
          recipientId,
          content: welcomeMessage,
        });
      }
      
      if (dealer?.userId) {
        await storage.createNotification({
          userId: dealer.userId,
          deliveryId: req.params.id,
          type: "delivery_accepted",
          title: "Delivery Accepted",
          message: `${driver?.name || "A driver"} has accepted a delivery request.`,
          read: false,
        });
      }
      if (sales?.userId) {
        await storage.createNotification({
          userId: sales.userId,
          deliveryId: req.params.id,
          type: "delivery_accepted",
          title: "Delivery Accepted",
          message: `${driver?.name || "A driver"} has accepted your delivery request.`,
          read: false,
        });
      }
      
      // Send push notifications
      const vehicleInfo = `${updatedDelivery.year || ''} ${updatedDelivery.make || ''} ${updatedDelivery.model || ''}`.trim() || 'Vehicle';
      const recipientUserIds = [dealer?.userId, sales?.userId].filter((id): id is string => !!id);
      if (recipientUserIds.length > 0) {
        notifyDriverAccepted(
          req.params.id,
          driver?.name || 'A driver',
          vehicleInfo,
          recipientUserIds
        ).catch(err => console.error('Push notification error:', err));
      }
      
      res.json(updatedDelivery);
    } catch (error) {
      console.error("Accept delivery error:", error);
      res.status(500).json({ error: "Failed to accept delivery" });
    }
  });

  app.get("/api/deliveries/:id/photos", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      
      const photos = await storage.getDeliveryPhotos(req.params.id);
      res.json(photos);
    } catch (error) {
      console.error("Error fetching delivery photos:", error);
      res.status(500).json({ error: "Failed to fetch photos" });
    }
  });

  app.post("/api/deliveries/:id/photos", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      
      const { objectPath, photoType, caption, uploaderRole } = req.body;
      
      if (!objectPath || !photoType || !uploaderRole) {
        return res.status(400).json({ error: "Missing required fields: objectPath, photoType, uploaderRole" });
      }
      
      let uploaderId = userId;
      if (uploaderRole === 'driver') {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) uploaderId = driver.id;
      } else if (uploaderRole === 'sales') {
        const sales = await storage.getSalesByUserId(userId);
        if (sales) uploaderId = sales.id;
      }
      
      const photo = await storage.createDeliveryPhoto({
        deliveryId: req.params.id,
        uploaderId,
        uploaderRole,
        photoType,
        objectPath,
        caption: caption || "",
      });
      
      res.json(photo);
    } catch (error) {
      console.error("Error saving delivery photo:", error);
      res.status(500).json({ error: "Failed to save photo" });
    }
  });

  app.delete("/api/delivery-photos/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) return res.status(401).json({ error: "Authentication required" });
      
      const photo = await storage.getDeliveryPhoto(req.params.id);
      if (!photo) return res.status(404).json({ error: "Photo not found" });
      
      const driver = await storage.getDriverByUserId(userId);
      const sales = await storage.getSalesByUserId(userId);
      const isOwner = photo.uploaderId === userId || 
        (driver && photo.uploaderId === driver.id) || 
        (sales && photo.uploaderId === sales.id);
      
      if (!isOwner) return res.status(403).json({ error: "Not authorized to delete this photo" });
      
      await storage.deleteDeliveryPhoto(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting delivery photo:", error);
      res.status(500).json({ error: "Failed to delete photo" });
    }
  });

  app.post("/api/deliveries/:id/decline", async (req, res) => {
    try {
      const { driverId } = req.body;
      const delivery = await storage.getDelivery(req.params.id);
      
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      // Add driver to declined list so they don't see this delivery again
      const currentDeclined = delivery.declinedDriverIds || [];
      const newDeclinedList = currentDeclined.includes(driverId) 
        ? currentDeclined 
        : [...currentDeclined, driverId];
      
      const updatedDelivery = await storage.updateDelivery(req.params.id, {
        driverId: null,
        status: "pending",
        declinedDriverIds: newDeclinedList,
      });
      
      const driver = await storage.getDriver(driverId);
      const dealer = await storage.getDealer(delivery.dealerId);
      const sales = delivery.salesId ? await storage.getSales(delivery.salesId) : null;
      
      if (sales?.userId) {
        await storage.createNotification({
          userId: sales.userId,
          deliveryId: req.params.id,
          type: "delivery_declined",
          title: "Delivery Request Declined",
          message: `${driver?.name || "A driver"} has declined the delivery request for VIN: ${delivery.vin}. Please assign another driver.`,
          read: false,
        });
      }
      if (dealer?.userId && dealer.userId !== sales?.userId) {
        await storage.createNotification({
          userId: dealer.userId,
          deliveryId: req.params.id,
          type: "delivery_declined",
          title: "Delivery Request Declined",
          message: `${driver?.name || "A driver"} has declined a delivery request for VIN: ${delivery.vin}.`,
          read: false,
        });
      }
      
      res.json(updatedDelivery);
    } catch (error) {
      console.error("Decline delivery error:", error);
      res.status(500).json({ error: "Failed to decline delivery" });
    }
  });

  app.get("/api/messages/:deliveryId", pollingRateLimiter, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const delivery = await storage.getDelivery(req.params.deliveryId);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const isParticipant = await isDeliveryParticipant(userId, delivery);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant in this delivery" });
      }
      
      const messages = await storage.getMessages(req.params.deliveryId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", async (req, res) => {
    try {
      const senderUserId = (req.session as any)?.userId;
      if (!senderUserId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const delivery = await storage.getDelivery(req.body.deliveryId);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const isParticipant = await isDeliveryParticipant(senderUserId, delivery);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant in this delivery" });
      }
      
      const message = await storage.createMessage(req.body);
      
      try {
        let senderName = "Someone";
        const user = await storage.getUser(senderUserId);
        if (user) {
          if (user.role === 'dealer') {
            const dealer = await storage.getDealerByUserId(senderUserId);
            senderName = dealer?.name || "Dealership";
          } else if (user.role === 'sales') {
            const sales = await storage.getSalesByUserId(senderUserId);
            senderName = sales?.name || "Sales Rep";
          } else if (user.role === 'driver') {
            const driver = await storage.getDriverByUserId(senderUserId);
            senderName = driver?.name || "Driver";
          }
        }
        
        const recipientId = req.body.recipientId;
        if (recipientId) {
          await notifyNewMessage(message.deliveryId, senderName, recipientId);
        }
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }
      
      res.json(message);
    } catch (error) {
      console.error("Create message error:", error);
      res.status(500).json({ error: "Failed to create message" });
    }
  });

  app.post("/api/messages/:deliveryId/read", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const delivery = await storage.getDelivery(req.params.deliveryId);
      if (!delivery) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const isParticipant = await isDeliveryParticipant(userId, delivery);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied - not a participant in this delivery" });
      }
      
      await storage.markMessagesAsRead(req.params.deliveryId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark messages read error:", error);
      res.status(500).json({ error: "Failed to mark messages as read" });
    }
  });

  app.get("/api/notifications", pollingRateLimiter, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const notifications = await storage.getNotifications(userId);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to get notifications" });
    }
  });

  app.post("/api/notifications", async (req, res) => {
    try {
      const notification = await storage.createNotification(req.body);
      res.json(notification);
    } catch (error) {
      console.error("Create notification error:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      await storage.markNotificationAsRead(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark notification read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  app.get("/api/messages/unread/count", pollingRateLimiter, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const count = await storage.getUnreadMessagesCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get unread messages count error:", error);
      res.status(500).json({ error: "Failed to get unread messages count" });
    }
  });

  app.get("/api/conversations", pollingRateLimiter, async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const conversations = await storage.getConversations(userId);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.get("/api/deliveries/:id/with-relations", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const result = await storage.getDeliveryWithRelations(req.params.id);
      if (!result) {
        return res.status(404).json({ error: "Delivery not found" });
      }
      
      const isParticipant = await isDeliveryParticipant(userId, result.delivery);
      if (!isParticipant) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Get delivery with relations error:", error);
      res.status(500).json({ error: "Failed to get delivery" });
    }
  });

  app.get("/api/driver-statistics/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const hasAccess = await canAccessDealerData(userId, req.params.dealerId);
      if (!hasAccess) {
        return res.status(403).json({ error: "Access denied" });
      }
      
      const stats = await storage.getDriverStatisticsByDealerId(req.params.dealerId);
      res.json(stats);
    } catch (error) {
      console.error("Get driver statistics error:", error);
      res.status(500).json({ error: "Failed to get driver statistics" });
    }
  });

  app.get("/api/drivers/:driverId/availability", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ error: "Date parameter required" });
      }

      const driverId = req.params.driverId;
      const driver = await storage.getDriver(driverId);
      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      let hasAccess = false;
      if (user.role === 'driver') {
        const currentDriver = await storage.getDriverByUserId(userId);
        hasAccess = currentDriver?.id === driverId;
      } else if (user.role === 'sales') {
        const sales = await storage.getSalesByUserId(userId);
        if (sales?.dealerId) {
          const approvedDrivers = await storage.getApprovedDriversByDealerId(sales.dealerId);
          hasAccess = approvedDrivers.some(ad => ad.driverId === driverId);
        }
      } else if (user.role === 'dealer') {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          const approvedDrivers = await storage.getApprovedDriversByDealerId(dealer.id);
          hasAccess = approvedDrivers.some(ad => ad.driverId === driverId);
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to view this driver's availability" });
      }

      const driverDeliveries = await storage.getDeliveriesByDriverId(driverId);
      const scheduledOnDate = driverDeliveries.filter(d => 
        d.scheduledDate === date && 
        !['completed', 'cancelled'].includes(d.status || '')
      );

      res.json({
        driverId,
        date,
        isAvailable: scheduledOnDate.length === 0,
        scheduledDeliveries: scheduledOnDate.map(d => ({
          id: d.id,
          scheduledTime: d.scheduledTime,
          status: d.status,
          dropoff: d.dropoff
        }))
      });
    } catch (error) {
      console.error("Check driver availability error:", error);
      res.status(500).json({ error: "Failed to check availability" });
    }
  });

  app.get("/api/driver-preferences/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const preferences = await storage.getDriverPreferencesByUserAndDealer(userId, req.params.dealerId);
      res.json(preferences);
    } catch (error) {
      console.error("Get driver preferences error:", error);
      res.status(500).json({ error: "Failed to get driver preferences" });
    }
  });

  app.post("/api/driver-preferences", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { driverId, dealerId, preferenceLevel } = req.body;
      if (!driverId || !dealerId || typeof preferenceLevel !== 'number') {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const preference = await storage.upsertDriverPreference({ userId, driverId, dealerId, preferenceLevel });
      res.json(preference);
    } catch (error) {
      console.error("Upsert driver preference error:", error);
      res.status(500).json({ error: "Failed to save driver preference" });
    }
  });

  app.get("/api/driver-applications", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          const applications = await storage.getDriverApplications(driver.id);
          return res.json(applications);
        }
      } else if (user.role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          const applications = await storage.getDriverApplicationsByDealerId(dealer.id);
          return res.json(applications);
        }
      }
      
      res.json([]);
    } catch (error) {
      console.error("Get driver applications error:", error);
      res.status(500).json({ error: "Failed to get driver applications" });
    }
  });

  app.post("/api/driver-applications", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const driver = await storage.getDriverByUserId(userId);
      if (!driver) {
        return res.status(404).json({ error: "Driver profile not found" });
      }
      
      const body = { ...req.body, driverId: driver.id };
      const application = await storage.createDriverApplication(body);
      
      // Send push notification to dealer about new application (with fallback name)
      try {
        const driver = await storage.getDriver(application.driverId);
        const dealer = await storage.getDealer(application.dealerId);
        if (dealer?.userId) {
          const driverName = driver?.name || "A driver";
          await notifyDriverApplication(dealer.userId, driverName, application.id);
        }
      } catch (pushError) {
        console.error("Push notification error:", pushError);
      }
      
      res.json(application);
    } catch (error) {
      console.error("Create driver application error:", error);
      res.status(500).json({ error: "Failed to create driver application" });
    }
  });

  app.patch("/api/driver-applications/:id", async (req, res) => {
    try {
      // Middleware handles snake_case->camelCase and date parsing
      const { status } = req.body;
      const application = await storage.updateDriverApplication(req.params.id, req.body);
      
      if (status === "approved" && application) {
        await storage.createApprovedDriverDealer({
          driverId: application.driverId,
          dealerId: application.dealerId,
          isVerified: true,
          verifiedAt: new Date(),
        });
      }
      
      // Send push notification to driver about application decision (with fallback name)
      if (application && (status === "approved" || status === "rejected")) {
        try {
          const driver = await storage.getDriver(application.driverId);
          const dealer = await storage.getDealer(application.dealerId);
          if (driver?.userId) {
            const dealerName = dealer?.name || "A dealership";
            await notifyApplicationDecision(driver.userId, dealerName, status === "approved");
          }
        } catch (pushError) {
          console.error("Push notification error:", pushError);
        }
      }
      
      res.json(application);
    } catch (error) {
      console.error("Update driver application error:", error);
      res.status(500).json({ error: "Failed to update driver application" });
    }
  });

  app.get("/api/approved-driver-dealers", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      if (user.role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (driver) {
          const approvals = await storage.getApprovedDriverDealers(driver.id);
          return res.json(approvals);
        }
      } else if (user.role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          const approvals = await storage.getApprovedDriversByDealerId(dealer.id);
          return res.json(approvals);
        }
      }
      
      res.json([]);
    } catch (error) {
      console.error("Get approved driver dealers error:", error);
      res.status(500).json({ error: "Failed to get approved driver dealers" });
    }
  });

  app.get("/api/approved-driver-dealers/driver/:driverId", async (req, res) => {
    try {
      const approvals = await storage.getApprovedDriverDealers(req.params.driverId);
      const approvalsWithDealers = await Promise.all(
        approvals.map(async (a) => {
          const dealer = await storage.getDealer(a.dealerId);
          return { ...a, dealer };
        })
      );
      res.json(approvalsWithDealers.filter(a => a.dealer));
    } catch (error) {
      console.error("Get approved dealerships for driver error:", error);
      res.status(500).json({ error: "Failed to get approved dealerships" });
    }
  });

  app.post("/api/approved-driver-dealers", async (req, res) => {
    try {
      const { driverId, dealerId } = req.body;
      if (!driverId || !dealerId) {
        return res.status(400).json({ error: "driverId and dealerId are required" });
      }
      const approval = await storage.createApprovedDriverDealer({ driverId, dealerId });
      res.json(approval);
    } catch (error) {
      console.error("Create approved driver dealer error:", error);
      res.status(500).json({ error: "Failed to create approved driver dealer" });
    }
  });

  app.delete("/api/approved-driver-dealers/:driverId/:dealerId", async (req, res) => {
    try {
      await storage.deleteApprovedDriverDealer(req.params.driverId, req.params.dealerId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete approved driver dealer error:", error);
      res.status(500).json({ error: "Failed to delete approved driver dealer" });
    }
  });

  app.patch("/api/approved-driver-dealers/:driverId/:dealerId/verification", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (!dealer) {
        const admin = await storage.getDealerAdminByUserId(userId);
        if (!admin || admin.dealerId !== req.params.dealerId) {
          return res.status(403).json({ error: "Forbidden - not authorized for this dealer" });
        }
      } else if (dealer.id !== req.params.dealerId) {
        return res.status(403).json({ error: "Forbidden - not authorized for this dealer" });
      }
      
      const { isVerified, notes } = req.body;
      if (typeof isVerified !== 'boolean') {
        return res.status(400).json({ error: "isVerified must be a boolean" });
      }
      
      const updated = await storage.updateDriverVerification(
        req.params.driverId,
        req.params.dealerId,
        isVerified,
        notes
      );
      
      if (!updated) {
        return res.status(404).json({ error: "Driver-dealer relationship not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Update driver verification error:", error);
      res.status(500).json({ error: "Failed to update driver verification" });
    }
  });

  app.get("/api/dealer-admins", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const dealer = await storage.getDealerByUserId(userId);
      if (!dealer) {
        const admin = await storage.getDealerAdminByUserId(userId);
        if (admin) {
          const admins = await storage.getDealerAdmins(admin.dealerId);
          return res.json(admins);
        }
        return res.status(404).json({ error: "Dealer not found" });
      }
      
      const admins = await storage.getDealerAdmins(dealer.id);
      res.json(admins);
    } catch (error) {
      console.error("Get dealer admins error:", error);
      res.status(500).json({ error: "Failed to get dealer admins" });
    }
  });

  app.post("/api/dealer-admins", async (req, res) => {
    try {
      const admin = await storage.createDealerAdmin(req.body);
      res.json(admin);
    } catch (error) {
      console.error("Create dealer admin error:", error);
      res.status(500).json({ error: "Failed to create dealer admin" });
    }
  });

  app.delete("/api/dealer-admins/:id", async (req, res) => {
    try {
      await storage.deleteDealerAdmin(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete dealer admin error:", error);
      res.status(500).json({ error: "Failed to delete dealer admin" });
    }
  });

  // Sales self-signup - creates user and sales record with pending status
  app.post("/api/auth/register-sales", async (req, res) => {
    try {
      const { email, password, name, phone, dealerId } = req.body;
      
      if (!email || !password || !name || !dealerId) {
        return res.status(400).json({ error: "Email, password, name, and dealership are required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      
      // Verify the dealership exists
      const dealer = await storage.getDealer(dealerId);
      if (!dealer) {
        return res.status(400).json({ error: "Invalid dealership selected" });
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user and sales record in transaction
      const result = await db.transaction(async (tx) => {
        // Create user with sales role
        const [user] = await tx.insert(schema.users).values({
          email: normalizedEmail,
          passwordHash,
          role: "sales",
        }).returning();
        
        // Create sales record with pending status
        const [sales] = await tx.insert(schema.sales).values({
          userId: user.id,
          dealerId,
          name,
          email: normalizedEmail,
          phone: phone || "",
          status: "pending", // Needs dealer approval
        }).returning();
        
        return { user, sales };
      });
      
      // Set session
      (req.session as any).userId = result.user.id;
      (req.session as any).role = result.user.role;
      
      res.json({ 
        user: { id: result.user.id, email: result.user.email, role: result.user.role },
        sales: result.sales,
        status: "pending"
      });
    } catch (error) {
      console.error("Sales registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Manager/Admin request access - creates user and pending dealer_admin record
  app.post("/api/auth/register-manager", async (req, res) => {
    try {
      const { email, password, name, phone: _phone, dealerId, role } = req.body;
      
      if (!email || !password || !name || !dealerId || !role) {
        return res.status(400).json({ error: "Email, password, name, dealership, and role are required" });
      }
      
      const normalizedEmail = email.toLowerCase().trim();
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }
      
      // Verify the dealership exists
      const dealer = await storage.getDealer(dealerId);
      if (!dealer) {
        return res.status(400).json({ error: "Invalid dealership selected" });
      }
      
      // Hash password
      const passwordHash = await hashPassword(password);
      
      // Create user and pending dealer_admin record in transaction
      await db.transaction(async (tx) => {
        // Create user with dealer role
        const [user] = await tx.insert(schema.users).values({
          email: normalizedEmail,
          passwordHash,
          role: "dealer",
        }).returning();
        
        // Create dealer_admin record with pending status
        await tx.insert(schema.dealerAdmins).values({
          userId: user.id,
          dealerId,
          role: role || "Manager",
          status: "pending",
        });
      });
      
      res.json({ 
        success: true,
        message: "Your request has been submitted. An existing admin will review and approve your access."
      });
    } catch (error) {
      console.error("Manager registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // Approve a sales person (dealer/manager only)
  app.post("/api/sales/:id/approve", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const salesId = req.params.id;
      const salesRecord = await storage.getSales(salesId);
      if (!salesRecord) {
        return res.status(404).json({ error: "Sales record not found" });
      }
      
      // Check if user has permission to approve (dealer owner/manager)
      const dealer = await storage.getDealerByUserId(userId);
      const dealerAdmin = await storage.getDealerAdminByUserId(userId);
      
      const hasAccess = 
        (dealer && dealer.id === salesRecord.dealerId) ||
        (dealerAdmin && dealerAdmin.dealerId === salesRecord.dealerId && 
         (dealerAdmin.role === "owner" || dealerAdmin.role === "manager"));
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to approve sales staff" });
      }
      
      const updatedSales = await storage.updateSales(salesId, {
        status: "active",
        activatedAt: new Date(),
      });
      
      // Notify the sales person
      if (salesRecord.userId) {
        await storage.createNotification({
          userId: salesRecord.userId,
          deliveryId: null,
          type: "sales_approved",
          title: "Account Approved!",
          message: `Your account has been approved. You can now request deliveries.`,
          read: false,
        });
      }
      
      res.json(updatedSales);
    } catch (error) {
      console.error("Approve sales error:", error);
      res.status(500).json({ error: "Failed to approve sales staff" });
    }
  });

  // Reject a sales person (dealer/manager only)
  app.post("/api/sales/:id/reject", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const salesId = req.params.id;
      const { reason } = req.body;
      const salesRecord = await storage.getSales(salesId);
      if (!salesRecord) {
        return res.status(404).json({ error: "Sales record not found" });
      }
      
      // Check if user has permission
      const dealer = await storage.getDealerByUserId(userId);
      const dealerAdmin = await storage.getDealerAdminByUserId(userId);
      
      const hasAccess = 
        (dealer && dealer.id === salesRecord.dealerId) ||
        (dealerAdmin && dealerAdmin.dealerId === salesRecord.dealerId && 
         (dealerAdmin.role === "owner" || dealerAdmin.role === "manager"));
      
      if (!hasAccess) {
        return res.status(403).json({ error: "Not authorized to reject sales staff" });
      }
      
      const updatedSales = await storage.updateSales(salesId, {
        status: "rejected",
      });
      
      // Notify the sales person
      if (salesRecord.userId) {
        await storage.createNotification({
          userId: salesRecord.userId,
          deliveryId: null,
          type: "sales_rejected",
          title: "Account Not Approved",
          message: reason || "Your request to join this dealership was not approved.",
          read: false,
        });
      }
      
      res.json(updatedSales);
    } catch (error) {
      console.error("Reject sales error:", error);
      res.status(500).json({ error: "Failed to reject sales staff" });
    }
  });

  app.post("/api/sales/check-preregistered", async (req, res) => {
    try {
      const { email, dealerId } = req.body;
      const sales = await storage.getSalesByEmailAndDealerId(email.toLowerCase().trim(), dealerId);
      if (sales && sales.status === "pending_signup") {
        res.json({ preRegistered: true, salesId: sales.id });
      } else {
        res.json({ preRegistered: false });
      }
    } catch (error) {
      console.error("Check preregistered error:", error);
      res.status(500).json({ error: "Failed to check registration status" });
    }
  });

  app.post("/api/sales/activate", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { salesId } = req.body;
      const sales = await storage.updateSales(salesId, {
        userId,
        status: "active",
        activatedAt: new Date(),
        passwordChanged: true,
      });
      
      res.json(sales);
    } catch (error) {
      console.error("Activate sales error:", error);
      res.status(500).json({ error: "Failed to activate sales account" });
    }
  });

  app.get("/api/user/admin-roles", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const roles = await storage.getAllDealerAdminsByUserId(userId);
      res.json(roles);
    } catch (error) {
      console.error("Get user admin roles error:", error);
      res.status(500).json({ error: "Failed to get admin roles" });
    }
  });

  app.get("/api/admin-invitations/pending", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const invitations = await storage.getPendingAdminInvitationsByEmail(user.email);
      res.json(invitations);
    } catch (error) {
      console.error("Get pending invitations error:", error);
      res.status(500).json({ error: "Failed to get pending invitations" });
    }
  });

  app.post("/api/admin-invitations/:id/accept", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const invitation = await storage.getAdminInvitationByToken(req.params.id);
      if (!invitation) {
        return res.status(404).json({ error: "Invitation not found" });
      }
      if (invitation.status !== "pending") {
        return res.status(400).json({ error: "Invitation is no longer pending" });
      }
      if (invitation.email.toLowerCase() !== user.email.toLowerCase()) {
        return res.status(403).json({ error: "Invitation not for this user" });
      }

      await storage.createDealerAdmin({
        dealerId: invitation.dealerId,
        userId,
        role: invitation.role,
      });

      await storage.updateAdminInvitation(invitation.id, {
        status: "accepted",
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(500).json({ error: "Failed to accept invitation" });
    }
  });

  app.patch("/api/user/profile", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const role = (req.session as any)?.role;
      if (!userId || !role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const updates = req.body;

      if (role === "dealer") {
        const dealer = await storage.getDealerByUserId(userId);
        if (!dealer) {
          return res.status(404).json({ error: "Dealer not found" });
        }
        const updated = await storage.updateDealer(dealer.id, updates);
        return res.json(updated);
      } else if (role === "sales") {
        const sales = await storage.getSalesByUserId(userId);
        if (!sales) {
          return res.status(404).json({ error: "Sales not found" });
        }
        const updated = await storage.updateSales(sales.id, updates);
        return res.json(updated);
      } else if (role === "driver") {
        const driver = await storage.getDriverByUserId(userId);
        if (!driver) {
          return res.status(404).json({ error: "Driver not found" });
        }
        const updated = await storage.updateDriver(driver.id, updates);
        return res.json(updated);
      }

      res.status(400).json({ error: "Invalid role" });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.patch("/api/user/password", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await db.update(schema.users).set({ passwordHash: hashedPassword }).where(eq(schema.users.id, userId));
      res.json({ success: true });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.get("/api/admin-invitations/dealer/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const invitations = await storage.getAdminInvitations(req.params.dealerId);
      res.json(invitations);
    } catch (error) {
      console.error("Get admin invitations error:", error);
      res.status(500).json({ error: "Failed to get admin invitations" });
    }
  });

  app.post("/api/admin-invitations", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const token = crypto.randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invitation = await storage.createAdminInvitation({
        ...req.body,
        token,
        status: "pending",
        expiresAt,
        invitedBy: userId,
      });
      
      const inviter = await storage.getUser(userId);
      let inviterName = 'Someone';
      let dealershipName = 'a dealership';
      
      if (inviter) {
        const dealer = await storage.getDealerByUserId(userId);
        if (dealer) {
          inviterName = dealer.name;
          dealershipName = dealer.name;
        } else {
          const admin = await storage.getDealerAdminByUserId(userId);
          if (admin) {
            const dealerInfo = await storage.getDealer(admin.dealerId);
            if (dealerInfo) {
              dealershipName = dealerInfo.name;
            }
          }
        }
      }
      
      const emailSent = await sendAdminInvitationEmail(
        req.body.email,
        inviterName,
        dealershipName,
        req.body.role,
        token
      );
      
      if (!emailSent) {
        console.warn('Admin invitation email could not be sent - email service not configured');
      }
      
      res.json(invitation);
    } catch (error) {
      console.error("Create admin invitation error:", error);
      res.status(500).json({ error: "Failed to create invitation" });
    }
  });

  app.delete("/api/admin-invitations/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      await storage.updateAdminInvitation(req.params.id, { status: "cancelled" });
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel admin invitation error:", error);
      res.status(500).json({ error: "Failed to cancel invitation" });
    }
  });

  app.get("/api/dealer-admins/with-emails/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const admins = await storage.getDealerAdmins(req.params.dealerId);
      const adminsWithEmails = await Promise.all(
        admins.map(async (admin) => {
          const user = await storage.getUser(admin.userId);
          return {
            ...admin,
            email: user?.email || "Unknown",
            name: user?.email?.split("@")[0] || "Unknown",
          };
        })
      );
      res.json(adminsWithEmails);
    } catch (error) {
      console.error("Get admins with emails error:", error);
      res.status(500).json({ error: "Failed to get admins" });
    }
  });

  app.patch("/api/dealer-admins/:id", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      const admin = await storage.updateDealerAdmin(req.params.id, req.body);
      res.json(admin);
    } catch (error) {
      console.error("Update dealer admin error:", error);
      res.status(500).json({ error: "Failed to update admin" });
    }
  });

  // Get pending manager requests for a dealership
  app.get("/api/dealer-admins/pending/:dealerId", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get all dealer admins with pending status
      const allAdmins = await storage.getDealerAdmins(req.params.dealerId);
      const pendingAdmins = allAdmins.filter(a => a.status === "pending");
      
      // Add email info to each
      const pendingWithEmails = await Promise.all(
        pendingAdmins.map(async (admin) => {
          const user = await storage.getUser(admin.userId);
          return {
            ...admin,
            email: user?.email || "Unknown",
            name: user?.email?.split("@")[0] || "Unknown",
          };
        })
      );
      
      res.json(pendingWithEmails);
    } catch (error) {
      console.error("Get pending admins error:", error);
      res.status(500).json({ error: "Failed to get pending managers" });
    }
  });

  // Approve a pending manager request
  app.post("/api/dealer-admins/:id/approve", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the admin record being approved
      const adminRecord = await storage.getDealerAdmin(req.params.id);
      if (!adminRecord) {
        return res.status(404).json({ error: "Manager request not found" });
      }
      
      // Verify the approver is an admin for this dealership
      const approverAdmin = await storage.getDealerAdminByUserId(userId);
      const approverDealer = await storage.getDealerByUserId(userId);
      
      const canApprove = 
        (approverDealer && approverDealer.id === adminRecord.dealerId) ||
        (approverAdmin && approverAdmin.dealerId === adminRecord.dealerId && approverAdmin.status === "approved");
      
      if (!canApprove) {
        return res.status(403).json({ error: "Not authorized to approve managers" });
      }
      
      // Update status to approved
      await storage.updateDealerAdmin(req.params.id, { 
        status: "approved",
        acceptedAt: new Date()
      });
      
      // Notify the manager
      await storage.createNotification({
        userId: adminRecord.userId,
        deliveryId: null,
        type: "admin_approved",
        title: "Admin Access Approved!",
        message: "Your request for admin access has been approved. You can now manage the dealership.",
        read: false,
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error("Approve manager error:", error);
      res.status(500).json({ error: "Failed to approve manager" });
    }
  });

  // Reject a pending manager request
  app.post("/api/dealer-admins/:id/reject", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      // Get the admin record being rejected
      const adminRecord = await storage.getDealerAdmin(req.params.id);
      if (!adminRecord) {
        return res.status(404).json({ error: "Manager request not found" });
      }
      
      // Verify the approver is an admin for this dealership
      const approverAdmin = await storage.getDealerAdminByUserId(userId);
      const approverDealer = await storage.getDealerByUserId(userId);
      
      const canReject = 
        (approverDealer && approverDealer.id === adminRecord.dealerId) ||
        (approverAdmin && approverAdmin.dealerId === adminRecord.dealerId && approverAdmin.status === "approved");
      
      if (!canReject) {
        return res.status(403).json({ error: "Not authorized to reject managers" });
      }
      
      // Delete the pending admin record and the associated user
      await storage.deleteDealerAdmin(req.params.id);
      await storage.deleteUser(adminRecord.userId);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Reject manager error:", error);
      res.status(500).json({ error: "Failed to reject manager" });
    }
  });

  // Search endpoint for drivers to find deliveries
  app.get("/api/search/deliveries", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const role = (req.session as any)?.role;
      if (!userId || !role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { q, status, dealerId, driverId, dateFrom, dateTo } = req.query;
      
      // Get all deliveries and filter based on role authorization
      let deliveries: any[] = [];
      
      if (driverId && typeof driverId === 'string') {
        // Only drivers can search by driverId, and only for their own deliveries
        if (role !== 'driver') {
          return res.status(403).json({ error: "Only drivers can search by driver ID" });
        }
        const driver = await storage.getDriverByUserId(userId);
        if (!driver || driver.id !== driverId) {
          return res.status(403).json({ error: "Can only search your own deliveries" });
        }
        deliveries = await storage.getDeliveriesByDriverId(driverId);
      } else if (dealerId && typeof dealerId === 'string') {
        // Only dealers and sales can search by dealerId
        if (role === 'driver') {
          return res.status(403).json({ error: "Drivers cannot search by dealer ID" });
        }
        // Verify user has access to this dealer's data
        if (role === 'dealer') {
          const dealer = await storage.getDealerByUserId(userId);
          if (!dealer || dealer.id !== dealerId) {
            return res.status(403).json({ error: "Can only search your own dealership's deliveries" });
          }
        } else if (role === 'sales') {
          const sales = await storage.getSalesByUserId(userId);
          if (!sales || sales.dealerId !== dealerId) {
            return res.status(403).json({ error: "Can only search your dealership's deliveries" });
          }
        } else {
          return res.status(403).json({ error: "Not authorized" });
        }
        deliveries = await storage.getDeliveriesByDealerId(dealerId);
      } else {
        // No scope specified - return empty
        return res.json([]);
      }

      // Filter by search query
      if (q && typeof q === 'string') {
        const query = q.toLowerCase();
        deliveries = deliveries.filter(d => 
          d.vin?.toLowerCase().includes(query) ||
          d.pickup?.toLowerCase().includes(query) ||
          d.dropoff?.toLowerCase().includes(query) ||
          d.pickupCity?.toLowerCase().includes(query) ||
          d.dropoffCity?.toLowerCase().includes(query) ||
          d.make?.toLowerCase().includes(query) ||
          d.model?.toLowerCase().includes(query)
        );
      }

      // Filter by status
      if (status && typeof status === 'string') {
        const statuses = status.split(',');
        deliveries = deliveries.filter(d => d.status && statuses.includes(d.status));
      }

      // Filter by date range
      if (dateFrom && typeof dateFrom === 'string') {
        const fromDate = new Date(dateFrom);
        deliveries = deliveries.filter(d => d.createdAt && new Date(d.createdAt) >= fromDate);
      }
      if (dateTo && typeof dateTo === 'string') {
        const toDate = new Date(dateTo);
        deliveries = deliveries.filter(d => d.createdAt && new Date(d.createdAt) <= toDate);
      }

      // Enrich with dealer/driver info
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (d) => {
          const dealer = await storage.getDealer(d.dealerId);
          const driver = d.driverId ? await storage.getDriver(d.driverId) : null;
          const sales = d.salesId ? await storage.getSales(d.salesId) : null;
          return { ...d, dealer, driver, sales: sales ? { name: sales.name } : null };
        })
      );

      res.json(enrichedDeliveries);
    } catch (error) {
      console.error("Search deliveries error:", error);
      res.status(500).json({ error: "Failed to search deliveries" });
    }
  });

  // CSV export for delivery history
  app.get("/api/deliveries/export/csv", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const role = (req.session as any)?.role;
      if (!userId || !role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { dealerId, status, dateFrom, dateTo } = req.query;
      
      if (!dealerId || typeof dealerId !== 'string') {
        return res.status(400).json({ error: "dealerId is required" });
      }

      // Verify user has access to export this dealer's data
      if (role === 'dealer') {
        const dealer = await storage.getDealerByUserId(userId);
        if (!dealer || dealer.id !== dealerId) {
          return res.status(403).json({ error: "Can only export your own dealership's deliveries" });
        }
      } else if (role === 'sales') {
        const sales = await storage.getSalesByUserId(userId);
        if (!sales || sales.dealerId !== dealerId) {
          return res.status(403).json({ error: "Can only export your dealership's deliveries" });
        }
      } else {
        // Drivers cannot export dealer data
        return res.status(403).json({ error: "Not authorized to export delivery data" });
      }

      let deliveries = await storage.getDeliveriesByDealerId(dealerId);

      // Apply filters
      if (status && typeof status === 'string') {
        const statuses = status.split(',');
        deliveries = deliveries.filter(d => d.status && statuses.includes(d.status));
      }
      if (dateFrom && typeof dateFrom === 'string') {
        const fromDate = new Date(dateFrom);
        deliveries = deliveries.filter(d => d.createdAt && new Date(d.createdAt) >= fromDate);
      }
      if (dateTo && typeof dateTo === 'string') {
        const toDate = new Date(dateTo);
        deliveries = deliveries.filter(d => d.createdAt && new Date(d.createdAt) <= toDate);
      }

      // Enrich with driver/sales names
      const enrichedDeliveries = await Promise.all(
        deliveries.map(async (d) => {
          const driver = d.driverId ? await storage.getDriver(d.driverId) : null;
          const sales = d.salesId ? await storage.getSales(d.salesId) : null;
          return { ...d, driverName: driver?.name || '', salesName: sales?.name || '' };
        })
      );

      // Generate CSV
      const headers = [
        'VIN', 'Status', 'Pickup Address', 'Dropoff Address', 
        'Driver', 'Sales Rep', 'Year', 'Make', 'Model',
        'Created At', 'Accepted At', 'Completed At', 'Notes'
      ];
      
      const rows = enrichedDeliveries.map(d => [
        d.vin || '',
        d.status || '',
        d.pickup || '',
        d.dropoff || '',
        d.driverName || '',
        d.salesName || '',
        d.year?.toString() || '',
        d.make || '',
        d.model || '',
        d.createdAt ? new Date(d.createdAt).toISOString() : '',
        d.acceptedAt ? new Date(d.acceptedAt).toISOString() : '',
        d.completedAt ? new Date(d.completedAt).toISOString() : '',
        (d.notes || '').replace(/"/g, '""')
      ]);

      const csvContent = [
        headers.map(h => `"${h}"`).join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="deliveries-${new Date().toISOString().split('T')[0]}.csv"`);
      res.send(csvContent);
    } catch (error) {
      console.error("Export deliveries error:", error);
      res.status(500).json({ error: "Failed to export deliveries" });
    }
  });

  // Onboarding Progress Routes
  app.get("/api/onboarding/progress", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const progress = await storage.getOnboardingProgress(userId);
      res.json({ progress: progress ? { completedSteps: progress.completedSteps, dismissed: progress.dismissed } : null });
    } catch (error) {
      console.error("Get onboarding progress error:", error);
      res.status(500).json({ error: "Failed to get onboarding progress" });
    }
  });

  app.patch("/api/onboarding/progress", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const role = (req.session as any)?.role;
      if (!userId || !role) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { completed_steps, dismissed } = req.body;

      let progress = await storage.getOnboardingProgress(userId);
      
      if (!progress) {
        progress = await storage.createOnboardingProgress({
          userId,
          role,
          completedSteps: completed_steps || [],
          dismissed: dismissed || false,
        });
      } else {
        const updates: any = {};
        if (completed_steps !== undefined) updates.completedSteps = completed_steps;
        if (dismissed !== undefined) updates.dismissed = dismissed;
        progress = await storage.updateOnboardingProgress(userId, updates);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Update onboarding progress error:", error);
      res.status(500).json({ error: "Failed to update onboarding progress" });
    }
  });

  // Push Token Routes
  app.post("/api/push-tokens", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { token, platform } = req.body;
      if (!token || !platform) {
        return res.status(400).json({ error: "Token and platform are required" });
      }

      await storage.createOrUpdatePushToken({ userId, token, platform });
      res.json({ success: true });
    } catch (error) {
      console.error("Register push token error:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });

  app.delete("/api/push-tokens", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      await storage.deletePushToken(userId, token);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete push token error:", error);
      res.status(500).json({ error: "Failed to delete push token" });
    }
  });
}
