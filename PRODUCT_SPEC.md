# PRODUCT_SPEC.md — SwapRunn (Authoritative)

SwapRunn is a job marketplace that connects car dealerships with independent drivers for vehicle deliveries and dealer swaps.

This spec defines REQUIRED behavior. Code must conform to this spec.

---

## USER TYPES (NON-NEGOTIABLE)

### Dealership Admin
- Owns a dealership organization
- Can:
  - Register dealership
  - Invite/manage sales staff
  - Approve or reject driver applications
  - Create and assign delivery jobs
  - View all dealership deliveries
  - Export delivery history (CSV)
- Cannot:
  - Accept or perform deliveries

### Sales Staff
- Belongs to exactly ONE dealership
- Must be linked to a dealership at signup
- Can:
  - Create delivery requests
  - View delivery status
  - Chat with assigned drivers
- Cannot:
  - Approve drivers
  - See other dealerships

### Driver
- Independent contractor
- Does NOT belong to any dealership
- Can:
  - Register independently
  - Apply to multiple dealerships
  - Accept or reject delivery jobs
  - Update delivery status through all stages
  - Chat only on accepted jobs
- Cannot:
  - Create deliveries
  - Access dealership admin data

---

## CORE FLOWS (MUST WORK END-TO-END)

### Registration & Auth
- Dealer signup creates dealership + admin
- Sales signup links to dealership
- Driver signup creates independent account
- Login persists across refresh
- Logout clears session
- Password reset works via secure token

### Driver Hiring
- Drivers apply to dealerships
- Admins approve or reject applications
- Only approved drivers can accept jobs from that dealership

### Delivery Lifecycle
1. Dealer or sales creates delivery
2. Eligible drivers can see delivery (only from dealerships that approved them)
3. Driver accepts delivery (atomic lock - no double booking)
4. Driver updates status through stages:
   - pending → pending_driver_acceptance → assigned → driver_en_route_pickup → arrived_at_pickup → in_transit → arrived_at_dropoff → completed
5. Cancellation allowed from any non-terminal state
6. Safe backward transitions allowed for corrections

### Chat/Messaging
- Chat is job-scoped (tied to a specific delivery)
- Only participants can message (assigned driver + dealer/sales who created job)
- Messages persist and are retrievable

### Notifications
- Users receive notifications for relevant events
- Unread counts are tracked

---

## AUTHORIZATION RULES (STRICT)

### Cross-Tenant Isolation
- Users can ONLY access data from their own scope:
  - Dealers: only their dealership's data
  - Sales: only their dealership's data
  - Drivers: only their own deliveries and approved dealership jobs

### Endpoint Authorization
- All API endpoints must verify:
  1. User is authenticated (session exists)
  2. User has correct role for the action
  3. User owns or is authorized to access the resource

---

## SECURITY REQUIREMENTS

- Passwords hashed with bcrypt
- Sessions stored server-side (PostgreSQL)
- Password reset tokens are SHA-256 hashed, single-use, 1-hour expiry
- Rate limiting on sensitive endpoints
- CSP headers in production
- No cross-tenant data exposure

---

## DATA INTEGRITY

- Delivery acceptance must be atomic (prevent race conditions)
- Status transitions must be validated (only allowed transitions)
- Foreign key constraints enforced
- Cascade deletion for account removal
