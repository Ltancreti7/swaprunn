export const DELIVERY_STATUSES = {
  PENDING: 'pending',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type DeliveryStatus = typeof DELIVERY_STATUSES[keyof typeof DELIVERY_STATUSES];

export const USER_ROLES = {
  DEALER: 'dealer',
  SALES: 'sales',
  DRIVER: 'driver',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const VEHICLE_TYPES = [
  'Car',
  'Truck',
  'Trailer',
  'SUV',
  'Van',
] as const;

export const SERVICE_RADIUS_OPTIONS = [
  25,
  50,
  75,
  100,
  150,
  200,
] as const;
