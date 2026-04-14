# SwapRunn Logistics Platform

## Overview

SwapRunn is a logistics platform designed to streamline vehicle deliveries and dealer swaps by connecting car dealerships, sales staff, and drivers. It offers role-based dashboards with features like real-time communication, delivery tracking, driver assignment with preferences, schedule coordination, and a robust notification system. The platform aims to optimize logistics operations within the automotive industry.

## User Preferences

Preferred communication style: Simple, everyday language.

### Design Preferences
- **Color Scheme**: Dark monochromatic theme with red accents
  - Primary actions (buttons): red-600/red-700 gradient
  - Active tab indicators: red-400 with underline
  - Tab badges: red-600 background
  - Secondary/cancel buttons: neutral-700 with visible borders (neutral-500/600)
  - Hero accent text: red-400 to red-500 gradient
- **Goal**: Buttons must look clearly clickable and active, not greyed out or disabled
- **Avoid**: Pure gray/stone colors for action buttons (looks disabled)

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: React Router DOM with protected, role-based routes
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Build Tool**: Vite
- **State Management**: React Context (AuthContext, ToastContext)
- **Mobile Support**: Capacitor for iOS native app deployment

### Backend Architecture
- **Server**: Express.js with TypeScript
- **API Structure**: RESTful endpoints
- **Session Management**: Express-session with PostgreSQL storage
- **Authentication**: Custom session-based auth with bcrypt
- **Database ORM**: Drizzle ORM

### Data Storage
- **Database**: PostgreSQL
- **Schema Management**: Drizzle ORM and Drizzle Kit

### Authentication
- Session-based with role-based access control (dealer, sales, driver).
- Password hashing using bcrypt.
- Password reset functionality with SHA-256 hashed tokens and email delivery via Resend.

### Real-time Features
- Polling-based chat messaging with typing indicators.
- Polling-based notification system with unread counters.

### Production Infrastructure
- **Email Service**: Resend API integration.
- **In-App Notifications**: NotificationCenter component with polling.
- **Push Notifications**: Firebase Cloud Messaging for native mobile apps (new delivery alerts, driver acceptance, chat messages, application updates).
- **Account Deletion**: Safe cascade deletion.
- **Rate Limiting**: In-memory rate limiting for login, polling, and sensitive operations (login: 10 req/min, polling: 20 req/10s, sensitive: 5 req/hour).
- **Race Condition Handling**: Atomic delivery acceptance using conditional updates.
- **Security Headers**: Comprehensive set of security headers.
- **Authorization**: Role-based access control and ownership verification across all API endpoints.
- **Delivery Tracking**: 8 granular status levels with validated transitions.
- **Search & Export**: Delivery search with filters and CSV export.
- **Legal Compliance**: Privacy Policy and Terms of Service.
- **Driver Verification**: Automatic upon dealer approval.
- **Estimated Pay**: Drivers see estimated earnings based on distance and hourly rate.
- **Manual Transmission Preference**: Drivers indicate capability during signup.
- **Atomic Dealer Registration**: Combined endpoint for user, dealer, and admin creation.
- **Simplified Sales Signup**: Self-registration with dealer approval workflow.
- **Manager Admin Access Request**: In-app request and approval for existing dealership managers.
- **Profile Picture Upload**: Drivers can upload profile pictures via Replit Object Storage.
- **Delivery Photo Documentation**: Drivers and sales can upload categorized photos (pickup, dropoff, odometer, damage, other) with captions; dealers view-only. Integrated into DriverDashboard, SalesDashboard, Chat, and DeliveryDetailsModal.
- **Double-Submit Prevention**: Delivery creation forms disable submit button during API call.

### Project Structure
- `/src`: React frontend (components, contexts, hooks, lib, pages)
- `/server`: Express backend (index, routes, storage, db)
- `/shared`: Shared TypeScript schemas
- `/ios`: Capacitor iOS project (Xcode)

### UI/UX and Feature Specifications
- **Dashboards**: Refactored for mobile-first experience with specific tab structures for Dealer, Sales, and Driver.
- **Theme**: Consistent dark charcoal theme across all pages with intentional contrast for readability.
- **User Onboarding**: OnboardingChecklist for guided setup.
- **Profile Management**: Detailed profile tab with avatar upload, statistics, and settings.
- **Availability Toggle**: Integrated into driver profile.
- **Calendar & Scheduling**: Month view calendar showing scheduled deliveries, delivery scheduling with driver availability checks.
- **Native App Feel**: iOS-style overscroll, active-press feedback, skeleton loading, pull-to-refresh.

### iOS App Configuration (Capacitor)
- **Info.plist**: Privacy usage descriptions configured (camera, photo library, location).
- **AppDelegate.swift**: Firebase initialization and APNs token forwarding configured.
- **Podfile**: All Capacitor plugins registered.
- **App Icons**: Complete set for iPhone, iPad, Watch, and Mac.

### Remaining iOS Steps (Requires Xcode on Mac)
1. Add `GoogleService-Info.plist` from Firebase Console to the Xcode project.
2. Add `FirebaseCore` pod to Podfile and run `pod install`.
3. Enable Push Notifications capability in Xcode (Signing & Capabilities).
4. Enable Background Modes > Remote Notifications (already in Info.plist).
5. Build and test on physical device or Simulator.
6. Configure App Store Connect for TestFlight submission.

## External Dependencies

### Database
- **PostgreSQL**
- **Drizzle ORM**

### Authentication & Backend
- **bcryptjs**
- **express-session**

### Mobile Deployment
- **Capacitor** (with plugins for Push notifications, Geolocation, Device info, Haptic feedback, Status bar control)
- **Firebase Cloud Messaging**

### Email Service
- **Resend API**

### Development Tools
- **Vite**
- **TypeScript**
- **ESLint**
- **tsx**
- **Vitest**
- **Supertest**
