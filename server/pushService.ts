import admin from "firebase-admin";
import { storage } from "./storage";

let firebaseApp: admin.app.App | null = null;

function getFirebaseApp(): admin.app.App | null {
  if (firebaseApp) {
    return firebaseApp;
  }

  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) {
    console.log("Firebase not configured - FIREBASE_SERVICE_ACCOUNT not set");
    return null;
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountJson);
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("Firebase Admin SDK initialized successfully");
    return firebaseApp;
  } catch (error) {
    console.error("Failed to initialize Firebase Admin SDK:", error);
    return null;
  }
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPushNotification(
  userId: string,
  payload: PushNotificationPayload
): Promise<boolean> {
  try {
    const tokens = await storage.getPushTokensByUserId(userId);
    
    if (tokens.length === 0) {
      return false;
    }

    const app = getFirebaseApp();
    if (!app) {
      console.log(`Push notification (no Firebase): ${payload.title} - ${payload.body}`);
      return false;
    }

    const results = await Promise.allSettled(
      tokens.map(async (tokenRecord) => {
        try {
          const message: admin.messaging.Message = {
            token: tokenRecord.token,
            notification: {
              title: payload.title,
              body: payload.body,
            },
            data: payload.data,
            apns: {
              payload: {
                aps: {
                  badge: 1,
                  sound: "default",
                },
              },
            },
            android: {
              priority: "high",
              notification: {
                sound: "default",
                channelId: "swaprunn_notifications",
              },
            },
          };

          await admin.messaging().send(message);
          console.log(`Push sent to ${tokenRecord.platform}: ${payload.title}`);
          return true;
        } catch (error: any) {
          if (error.code === "messaging/registration-token-not-registered" ||
              error.code === "messaging/invalid-registration-token") {
            console.log(`Removing invalid token for user ${userId}`);
            await storage.deletePushToken(userId, tokenRecord.token);
          } else {
            console.error(`Push failed for ${tokenRecord.platform}:`, error.message);
          }
          return false;
        }
      })
    );

    return results.some(r => r.status === "fulfilled" && r.value === true);
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}

export async function sendPushNotificationToMultipleUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<void> {
  if (userIds.length === 0) return;

  const tokens = await storage.getPushTokensForUsers(userIds);
  
  if (tokens.length === 0) {
    return;
  }

  const app = getFirebaseApp();
  if (!app) {
    console.log(`Push to ${userIds.length} users (no Firebase): ${payload.title}`);
    return;
  }

  const messages: admin.messaging.Message[] = tokens.map((tokenRecord) => ({
    token: tokenRecord.token,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    data: payload.data,
    apns: {
      payload: {
        aps: {
          badge: 1,
          sound: "default",
        },
      },
    },
    android: {
      priority: "high" as const,
      notification: {
        sound: "default",
        channelId: "swaprunn_notifications",
      },
    },
  }));

  try {
    const response = await admin.messaging().sendEach(messages);
    console.log(`Push sent: ${response.successCount}/${messages.length} successful`);

    response.responses.forEach(async (resp, idx) => {
      if (!resp.success && resp.error) {
        const error = resp.error;
        if (error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-registration-token") {
          const tokenRecord = tokens[idx];
          await storage.deletePushToken(tokenRecord.userId, tokenRecord.token);
        }
      }
    });
  } catch (error) {
    console.error("Error sending batch push notifications:", error);
  }
}

export async function notifyDeliveryStatusChange(
  deliveryId: string,
  newStatus: string,
  recipientUserIds: string[]
): Promise<void> {
  const statusMessages: Record<string, string> = {
    pending: "A new delivery has been created",
    pending_driver_acceptance: "A delivery is waiting for driver acceptance",
    assigned: "A driver has been assigned to your delivery",
    driver_en_route_pickup: "Driver is on the way to pickup",
    arrived_at_pickup: "Driver has arrived at pickup location",
    in_transit: "Your vehicle is in transit",
    arrived_at_dropoff: "Driver has arrived at dropoff location",
    completed: "Delivery has been completed",
    cancelled: "A delivery has been cancelled",
  };

  const message = statusMessages[newStatus] || `Delivery status updated to ${newStatus}`;

  await sendPushNotificationToMultipleUsers(recipientUserIds, {
    title: "Delivery Update",
    body: message,
    data: { deliveryId, status: newStatus, type: "delivery_status" },
  });
}

export async function notifyNewMessage(
  deliveryId: string,
  senderName: string,
  recipientUserId: string
): Promise<void> {
  await sendPushNotification(recipientUserId, {
    title: "New Message",
    body: `${senderName} sent you a message`,
    data: { deliveryId, type: "new_message" },
  });
}

export async function notifyNewDeliveryAvailable(
  deliveryId: string,
  vehicleInfo: string,
  estimatedPay: string,
  driverUserIds: string[]
): Promise<void> {
  await sendPushNotificationToMultipleUsers(driverUserIds, {
    title: "New Delivery Available",
    body: `${vehicleInfo} - Est. ${estimatedPay}`,
    data: { deliveryId, type: "new_delivery" },
  });
}

export async function notifyDriverAccepted(
  deliveryId: string,
  driverName: string,
  vehicleInfo: string,
  recipientUserIds: string[]
): Promise<void> {
  await sendPushNotificationToMultipleUsers(recipientUserIds, {
    title: "Driver Accepted",
    body: `${driverName} accepted the ${vehicleInfo} delivery`,
    data: { deliveryId, type: "driver_accepted" },
  });
}

export async function notifyDriverApplication(
  dealerUserId: string,
  driverName: string,
  applicationId: string
): Promise<void> {
  await sendPushNotification(dealerUserId, {
    title: "New Driver Application",
    body: `${driverName} has applied to join your dealership`,
    data: { applicationId, type: "driver_application" },
  });
}

export async function notifyApplicationDecision(
  driverUserId: string,
  dealerName: string,
  approved: boolean
): Promise<void> {
  await sendPushNotification(driverUserId, {
    title: approved ? "Application Approved" : "Application Update",
    body: approved 
      ? `${dealerName} has approved your driver application`
      : `Your application to ${dealerName} was not approved`,
    data: { type: "application_decision", approved: String(approved) },
  });
}
