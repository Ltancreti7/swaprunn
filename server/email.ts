const RESEND_API_KEY = process.env.RESEND_API_KEY;
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - email not sent:', options.subject, 'to:', options.to);
    return false;
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'SwapRunn <noreply@swaprunn.com>',
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Email send failed:', error);
      return false;
    }

    console.log('Email sent successfully to:', options.to);
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
  const resetUrl = `${APP_URL}/reset-password?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: 'Reset Your SwapRunn Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Reset Your Password</h1>
        <p>You requested to reset your password for your SwapRunn account.</p>
        <p>Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Reset Password</a>
        <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
        <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
      </div>
    `,
  });
}

export async function sendAdminInvitationEmail(
  email: string, 
  inviterName: string, 
  dealershipName: string, 
  role: string,
  token: string
): Promise<boolean> {
  const acceptUrl = `${APP_URL}/accept-invitation?token=${token}`;
  
  return sendEmail({
    to: email,
    subject: `You've been invited to join ${dealershipName} on SwapRunn`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">You're Invited!</h1>
        <p>${inviterName} has invited you to join <strong>${dealershipName}</strong> as a <strong>${role}</strong> on SwapRunn.</p>
        <p>SwapRunn helps car dealerships manage vehicle deliveries efficiently.</p>
        <p>Click the button below to accept your invitation and set up your account:</p>
        <a href="${acceptUrl}" style="display: inline-block; background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Accept Invitation</a>
        <p style="color: #666; font-size: 14px;">This invitation will expire in 7 days.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
      </div>
    `,
  });
}

export function isEmailConfigured(): boolean {
  return !!RESEND_API_KEY;
}

export interface DeliveryEmailData {
  vehicleInfo: string;
  vin: string;
  pickup: string;
  dropoff: string;
  scheduledDate?: string;
  estimatedPay?: string;
  deliveryId: string;
  notes?: string;
}

export async function sendNewDeliveryAlertToDrivers(
  drivers: { email: string; name: string }[],
  dealershipName: string,
  deliveryData: DeliveryEmailData
): Promise<number> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set - driver alerts not sent');
    return 0;
  }

  let successCount = 0;
  const deliveryUrl = `${APP_URL}/driver`;

  for (const driver of drivers) {
    const success = await sendEmail({
      to: driver.email,
      subject: `New Delivery Job Available - ${dealershipName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">New Delivery Available!</h1>
          <p>Hi ${driver.name},</p>
          <p><strong>${dealershipName}</strong> has a new delivery that needs a driver.</p>
          
          <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h3 style="margin-top: 0; color: #333;">Job Details</h3>
            <p><strong>Vehicle:</strong> ${deliveryData.vehicleInfo}</p>
            <p><strong>VIN:</strong> ${deliveryData.vin}</p>
            <p><strong>Pickup:</strong> ${deliveryData.pickup}</p>
            <p><strong>Dropoff:</strong> ${deliveryData.dropoff}</p>
            ${deliveryData.scheduledDate ? `<p><strong>Scheduled:</strong> ${deliveryData.scheduledDate}</p>` : ''}
            ${deliveryData.estimatedPay ? `<p><strong>Estimated Pay:</strong> ${deliveryData.estimatedPay}</p>` : ''}
            ${deliveryData.notes ? `<p><strong>Notes:</strong> ${deliveryData.notes}</p>` : ''}
          </div>
          
          <a href="${deliveryUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">View & Accept Job</a>
          
          <p style="color: #666; font-size: 14px;">Act fast - jobs are first-come, first-served!</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
          <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
        </div>
      `,
    });
    if (success) successCount++;
  }

  console.log(`Sent delivery alerts to ${successCount}/${drivers.length} drivers`);
  return successCount;
}

export async function sendDeliveryAcceptedToSales(
  salesEmail: string,
  salesName: string,
  driverName: string,
  driverPhone: string | null,
  deliveryData: DeliveryEmailData
): Promise<boolean> {
  const chatUrl = `${APP_URL}/chat/${deliveryData.deliveryId}`;

  return sendEmail({
    to: salesEmail,
    subject: `Driver Accepted Your Delivery - ${deliveryData.vehicleInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Your Delivery Has Been Accepted!</h1>
        <p>Hi ${salesName},</p>
        <p>Great news! <strong>${driverName}</strong> has accepted your delivery request.</p>
        
        <div style="background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #22c55e;">
          <h3 style="margin-top: 0; color: #166534;">Driver Information</h3>
          <p><strong>Driver:</strong> ${driverName}</p>
          ${driverPhone ? `<p><strong>Phone:</strong> ${driverPhone}</p>` : ''}
        </div>
        
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #333;">Delivery Details</h3>
          <p><strong>Vehicle:</strong> ${deliveryData.vehicleInfo}</p>
          <p><strong>VIN:</strong> ${deliveryData.vin}</p>
          <p><strong>Pickup:</strong> ${deliveryData.pickup}</p>
          <p><strong>Dropoff:</strong> ${deliveryData.dropoff}</p>
        </div>
        
        <a href="${chatUrl}" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">Chat with Driver</a>
        
        <p style="color: #666; font-size: 14px;">You can coordinate pickup time and any special instructions through the chat.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
      </div>
    `,
  });
}

export async function sendDeliveryAcceptedToDealer(
  dealerEmail: string,
  dealerName: string,
  driverName: string,
  salesName: string | null,
  deliveryData: DeliveryEmailData
): Promise<boolean> {
  return sendEmail({
    to: dealerEmail,
    subject: `Delivery Accepted - ${deliveryData.vehicleInfo}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #333;">Delivery Accepted</h1>
        <p>Hi ${dealerName},</p>
        <p><strong>${driverName}</strong> has accepted a delivery request${salesName ? ` from ${salesName}` : ''}.</p>
        
        <div style="background-color: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <h3 style="margin-top: 0; color: #333;">Delivery Details</h3>
          <p><strong>Vehicle:</strong> ${deliveryData.vehicleInfo}</p>
          <p><strong>VIN:</strong> ${deliveryData.vin}</p>
          <p><strong>Pickup:</strong> ${deliveryData.pickup}</p>
          <p><strong>Dropoff:</strong> ${deliveryData.dropoff}</p>
        </div>
        
        <a href="${APP_URL}/dealer" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">View Dashboard</a>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #999; font-size: 12px;">SwapRunn - Vehicle Delivery Made Simple</p>
      </div>
    `,
  });
}
