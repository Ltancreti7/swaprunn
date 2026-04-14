# SwapRunn

A job marketplace connecting car dealerships with independent drivers for vehicle deliveries and dealer swaps.

**Three user roles:** Dealer Admin · Sales Staff · Driver

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript + Tailwind CSS + Vite |
| Backend | Express.js + TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Session-based (express-session + bcrypt) |
| Email | Resend API (optional) |
| Mobile | Capacitor (iOS) |

---

## Local Development

### Prerequisites
- Node.js 18+
- PostgreSQL database (local or remote)

### Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy and fill in environment variables
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL and SESSION_SECRET

# 3. Push schema to your database
npm run db:push

# 4. (Optional) Seed with sample data
npm run seed

# 5. Start development server
npm run dev
```

The app runs at `http://localhost:5000` (frontend + backend on the same port).

---

## Deployment — Railway (Recommended)

Railway is the fastest way to deploy SwapRunn. It runs Node.js servers natively and provides a managed PostgreSQL database.

### Step 1 — Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/swaprunn.git
git push -u origin main
```

### Step 2 — Create Railway project

1. Go to [railway.app](https://railway.app) and sign in
2. Click **New Project → Deploy from GitHub repo**
3. Select your `swaprunn` repository

### Step 3 — Add PostgreSQL

1. In your Railway project, click **+ New** → **Database** → **PostgreSQL**
2. Railway automatically sets `DATABASE_URL` on your app service — nothing to copy

### Step 4 — Set environment variables

In Railway: click your app service → **Variables** tab → add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | Run `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` and paste the output |
| `APP_URL` | Your Railway domain, e.g. `https://swaprunn-production.up.railway.app` (set after first deploy) |
| `RESEND_API_KEY` | *(optional)* Your Resend API key for emails |

### Step 5 — Configure build & start commands

Railway auto-detects Node.js. Verify these settings in **Settings → Build & Deploy**:

| Setting | Value |
|---------|-------|
| Build Command | `npm run build` |
| Start Command | `npm start` |

### Step 6 — Run database migrations

After the first deploy, open Railway's **Shell** tab and run:

```bash
npm run db:push
```

### Step 7 — Update APP_URL

Once deployed, copy your Railway domain from the **Settings** tab and update the `APP_URL` environment variable to match. This is used in password reset and invitation emails.

---

## Deployment — Render (Alternative)

> **Note:** Render's free tier has ephemeral disk — uploaded profile/delivery photos will be lost on redeploy. Use Railway or add Cloudinary for persistent file storage.

1. Create a new **Web Service** → connect your GitHub repo
2. Build command: `npm run build`
3. Start command: `npm start`
4. Add environment variables (same as Railway above)
5. Add a **PostgreSQL** database from Render's dashboard
6. Run `npm run db:push` via Render's shell

---

## Environment Variables Reference

See `.env.example` for the full list with descriptions.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ | Long random string for session signing |
| `NODE_ENV` | ✅ | Set to `production` |
| `APP_URL` | ✅ | Public URL of deployed app (for emails) |
| `RESEND_API_KEY` | Optional | Email delivery (password reset, invitations) |
| `UPLOADS_DIR` | Optional | Absolute path for uploaded files (default: `./uploads`) |
| `FIREBASE_SERVICE_ACCOUNT` | Optional | Firebase push notifications (iOS app only) |

---

## Database Migrations

The schema is managed with Drizzle ORM.

```bash
# Push schema changes to your database (creates/alters tables)
npm run db:push

# Generate migration files (for version-controlled migrations)
npx drizzle-kit generate
```

---

## File Uploads

Profile photos and delivery photos are saved to the `uploads/` directory at the project root (or `UPLOADS_DIR` if set). The directory is created automatically on startup.

On **Railway**, disk storage persists across deploys. On **Render free tier**, it does not — consider [Cloudinary](https://cloudinary.com) for cloud storage.

---

## Email Setup (Resend)

1. Create a free account at [resend.com](https://resend.com)
2. Verify your sending domain (or use Resend's shared domain for testing)
3. Update the `from` address in `server/email.ts` to match your verified domain
4. Set `RESEND_API_KEY` in your environment

Without a `RESEND_API_KEY`, the app works normally — password reset and invitation emails are silently skipped (a warning is logged).

---

## Project Structure

```
swaprunn/
├── src/                    # React frontend
│   ├── components/         # Reusable UI components
│   ├── contexts/           # Auth, Toast contexts
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # API client, validation, utilities
│   └── pages/              # Page components (Dealer, Driver, Sales dashboards)
├── server/                 # Express backend
│   ├── index.ts            # Server entry point
│   ├── routes.ts           # All API routes
│   ├── storage.ts          # Database queries (Drizzle)
│   ├── db.ts               # Database connection
│   ├── upload.ts           # File upload handler
│   ├── email.ts            # Email delivery (Resend)
│   └── pushService.ts      # Firebase push notifications
├── shared/                 # Shared TypeScript types
│   └── schema.ts           # Drizzle schema + Zod validators
├── ios/                    # Capacitor iOS project
└── uploads/                # Uploaded files (auto-created, gitignored)
```

---

## iOS App (Capacitor)

The iOS app is built with Capacitor. Before building:

1. Add `GoogleService-Info.plist` from Firebase Console to the Xcode project
2. Enable Push Notifications in Xcode → Signing & Capabilities
3. Run `npx cap sync ios` after frontend changes
4. Open `ios/App/App.xcworkspace` in Xcode to build

See `replit.md` for complete iOS setup steps.
