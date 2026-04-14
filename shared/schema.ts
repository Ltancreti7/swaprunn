import { pgTable, text, integer, boolean, timestamp, uuid, time, date, numeric, interval, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const dealers = pgTable("dealers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  hourlyRate: integer("hourly_rate").default(2500),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sales = pgTable("sales", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id"),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  role: text("role"),
  status: text("status").default("pending_signup"),
  invitedAt: timestamp("invited_at"),
  acceptedAt: timestamp("accepted_at"),
  activatedAt: timestamp("activated_at"),
  lastLogin: timestamp("last_login"),
  passwordChanged: boolean("password_changed").default(false),
  defaultPickupLocation: text("default_pickup_location"),
  defaultPickupStreet: text("default_pickup_street"),
  defaultPickupCity: text("default_pickup_city"),
  defaultPickupState: text("default_pickup_state"),
  defaultPickupZip: text("default_pickup_zip"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const drivers = pgTable("drivers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull().unique(),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  canDriveManual: boolean("can_drive_manual").notNull().default(false),
  licenseNumber: text("license_number"),
  radius: integer("radius").notNull().default(50),
  status: text("status").notNull().default("active"),
  isAvailable: boolean("is_available").notNull().default(true),
  availableForCustomerDeliveries: boolean("available_for_customer_deliveries").notNull().default(true),
  availableForDealerSwaps: boolean("available_for_dealer_swaps").notNull().default(true),
  profileImage: text("profile_image"),
  activatedAt: timestamp("activated_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveries = pgTable("deliveries", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "set null" }),
  salesId: uuid("sales_id").references(() => sales.id, { onDelete: "set null" }),
  pickup: text("pickup").notNull(),
  dropoff: text("dropoff").notNull(),
  pickupStreet: text("pickup_street"),
  pickupCity: text("pickup_city"),
  pickupState: text("pickup_state"),
  pickupZip: text("pickup_zip"),
  dropoffStreet: text("dropoff_street"),
  dropoffCity: text("dropoff_city"),
  dropoffState: text("dropoff_state"),
  dropoffZip: text("dropoff_zip"),
  vin: text("vin").notNull(),
  notes: text("notes").default(""),
  status: text("status").default("pending"),
  year: integer("year"),
  make: text("make"),
  model: text("model"),
  transmission: text("transmission"),
  serviceType: text("service_type").default("delivery"),
  hasTrade: boolean("has_trade"),
  requiresSecondDriver: boolean("requires_second_driver"),
  requiredTimeframe: text("required_timeframe"),
  customDate: date("custom_date"),
  scheduledDate: date("scheduled_date"),
  scheduledTime: time("scheduled_time"),
  scheduleConfirmedBy: uuid("schedule_confirmed_by").references(() => sales.id, { onDelete: "set null" }),
  scheduleConfirmedAt: timestamp("schedule_confirmed_at"),
  chatActivatedAt: timestamp("chat_activated_at"),
  acceptedAt: timestamp("accepted_at"),
  acceptedBy: uuid("accepted_by").references(() => drivers.id, { onDelete: "set null" }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  cancelledAt: timestamp("cancelled_at"),
  cancelledBy: uuid("cancelled_by"),
  declinedDriverIds: text("declined_driver_ids").array().default([]),
  estimatedDistanceKm: numeric("estimated_distance_km", { precision: 10, scale: 2 }),
  estimatedDurationMinutes: integer("estimated_duration_minutes"),
  estimatedPayCents: integer("estimated_pay_cents"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryPhotos = pgTable("delivery_photos", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: uuid("delivery_id").references(() => deliveries.id, { onDelete: "cascade" }).notNull(),
  uploaderId: uuid("uploader_id").notNull(),
  uploaderRole: text("uploader_role").notNull(),
  photoType: text("photo_type").notNull(),
  objectPath: text("object_path").notNull(),
  caption: text("caption").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: uuid("delivery_id").references(() => deliveries.id, { onDelete: "cascade" }).notNull(),
  senderId: uuid("sender_id").notNull(),
  recipientId: uuid("recipient_id").notNull(),
  content: text("content").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  deliveryId: uuid("delivery_id").references(() => deliveries.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverApplications = pgTable("driver_applications", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "cascade" }).notNull(),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull().default("pending"),
  message: text("message").default(""),
  appliedAt: timestamp("applied_at").defaultNow().notNull(),
  reviewedAt: timestamp("reviewed_at"),
}, (table) => ({
  driverDealerUnique: uniqueIndex("driver_applications_driver_dealer_unique").on(table.driverId, table.dealerId),
}));

export const approvedDriverDealers = pgTable("approved_driver_dealers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "cascade" }).notNull(),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  approvedAt: timestamp("approved_at").defaultNow().notNull(),
  isVerified: boolean("is_verified").default(false).notNull(),
  verifiedAt: timestamp("verified_at"),
  verificationNotes: text("verification_notes"),
}, (table) => ({
  driverDealerUnique: uniqueIndex("approved_driver_dealers_driver_dealer_unique").on(table.driverId, table.dealerId),
}));

export const dealerAdmins = pgTable("dealer_admins", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  userId: uuid("user_id").notNull(),
  role: text("role").notNull(),
  status: text("status").default("approved").notNull(),
  invitedBy: uuid("invited_by"),
  invitedAt: timestamp("invited_at").defaultNow(),
  acceptedAt: timestamp("accepted_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const adminInvitations = pgTable("admin_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  email: text("email").notNull(),
  role: text("role").notNull(),
  invitedBy: uuid("invited_by").notNull(),
  token: text("token").notNull().unique().default(sql`gen_random_uuid()::text`),
  status: text("status").default("pending"),
  expiresAt: timestamp("expires_at").default(sql`now() + interval '7 days'`),
  createdAt: timestamp("created_at").defaultNow(),
});

export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  invitationCode: text("invitation_code").notNull().unique(),
  email: text("email").notNull(),
  role: text("role").notNull().default("sales"),
  invitedByName: text("invited_by_name"),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false),
  usedBy: uuid("used_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const driverPreferences = pgTable("driver_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").notNull(),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "cascade" }).notNull(),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  preferenceLevel: integer("preference_level").default(3),
  lastUsedAt: timestamp("last_used_at").defaultNow(),
  useCount: integer("use_count").default(1),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const driverStatistics = pgTable("driver_statistics", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: uuid("driver_id").references(() => drivers.id, { onDelete: "cascade" }).notNull(),
  dealerId: uuid("dealer_id").references(() => dealers.id, { onDelete: "cascade" }).notNull(),
  totalDeliveries: integer("total_deliveries").default(0),
  completedDeliveries: integer("completed_deliveries").default(0),
  cancelledDeliveries: integer("cancelled_deliveries").default(0),
  averageCompletionTime: interval("average_completion_time").default("0 seconds"),
  onTimePercentage: numeric("on_time_percentage", { precision: 5, scale: 2 }).default("100.00"),
  lastDeliveryAt: timestamp("last_delivery_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const deliveryStatusHistory = pgTable("delivery_status_history", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  deliveryId: uuid("delivery_id").references(() => deliveries.id, { onDelete: "cascade" }).notNull(),
  status: text("status").notNull(),
  changedBy: uuid("changed_by").notNull(),
  changedByRole: text("changed_by_role").notNull(),
  notes: text("notes").default(""),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const onboardingProgress = pgTable("onboarding_progress", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull().unique(),
  role: text("role").notNull(),
  completedSteps: text("completed_steps").array().default(sql`'{}'::text[]`).notNull(),
  dismissed: boolean("dismissed").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pushTokens = pgTable("push_tokens", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  token: text("token").notNull(),
  platform: text("platform").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertDealerSchema = createInsertSchema(dealers).omit({ id: true, createdAt: true });
export const insertSalesSchema = createInsertSchema(sales).omit({ id: true, createdAt: true });
export const insertDriverSchema = createInsertSchema(drivers).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliverySchema = createInsertSchema(deliveries).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export const insertNotificationSchema = createInsertSchema(notifications).omit({ id: true, createdAt: true });
export const insertDriverApplicationSchema = createInsertSchema(driverApplications).omit({ id: true, appliedAt: true });
export const insertApprovedDriverDealerSchema = createInsertSchema(approvedDriverDealers).omit({ id: true, approvedAt: true });
export const insertDealerAdminSchema = createInsertSchema(dealerAdmins).omit({ id: true, createdAt: true });
export const insertAdminInvitationSchema = createInsertSchema(adminInvitations).omit({ id: true, createdAt: true, token: true });
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertOnboardingProgressSchema = createInsertSchema(onboardingProgress).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDeliveryPhotoSchema = createInsertSchema(deliveryPhotos).omit({ id: true, createdAt: true });
export const insertPushTokenSchema = createInsertSchema(pushTokens).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertDeliveryPhoto = z.infer<typeof insertDeliveryPhotoSchema>;
export type InsertDealer = z.infer<typeof insertDealerSchema>;
export type InsertSales = z.infer<typeof insertSalesSchema>;
export type InsertDriver = z.infer<typeof insertDriverSchema>;
export type InsertDelivery = z.infer<typeof insertDeliverySchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type InsertDriverApplication = z.infer<typeof insertDriverApplicationSchema>;
export type InsertApprovedDriverDealer = z.infer<typeof insertApprovedDriverDealerSchema>;
export type InsertDealerAdmin = z.infer<typeof insertDealerAdminSchema>;
export type InsertAdminInvitation = z.infer<typeof insertAdminInvitationSchema>;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertOnboardingProgress = z.infer<typeof insertOnboardingProgressSchema>;
export type InsertPushToken = z.infer<typeof insertPushTokenSchema>;

export type Dealer = typeof dealers.$inferSelect;
export type Sales = typeof sales.$inferSelect;
export type Driver = typeof drivers.$inferSelect;
export type Delivery = typeof deliveries.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type DriverApplication = typeof driverApplications.$inferSelect;
export type ApprovedDriverDealer = typeof approvedDriverDealers.$inferSelect;
export type DealerAdmin = typeof dealerAdmins.$inferSelect;
export type AdminInvitation = typeof adminInvitations.$inferSelect;
export type User = typeof users.$inferSelect;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type DriverStatistics = typeof driverStatistics.$inferSelect;
export type DriverPreference = typeof driverPreferences.$inferSelect;
export type OnboardingProgress = typeof onboardingProgress.$inferSelect;
export type DeliveryPhoto = typeof deliveryPhotos.$inferSelect;
export type PushToken = typeof pushTokens.$inferSelect;

export type AdminRole = 'owner' | 'manager' | 'viewer';

export type DeliveryTimeframe = 'tomorrow' | 'next_few_days' | 'next_week' | 'custom';

export interface AddressFields {
  street: string;
  city: string;
  state: string;
  zip: string;
}
