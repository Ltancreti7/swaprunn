import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { registerUploadRoutes } from "./upload";

const app = express();

// Trust proxy for production (required for secure cookies behind reverse proxy)
if (process.env.NODE_ENV === "production") {
  app.set('trust proxy', 1);
}

// Security headers
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // XSS protection (legacy but still useful for older browsers)
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions policy - disable unnecessary features
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  // Content Security Policy
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self'; " +
      // 'unsafe-inline' required: React applies style={{}} attributes which browsers
      // block under strict style-src. Tailwind utility classes are fine (external CSS),
      // but React inline style props are flagged without this.
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https: blob:; " +
      "font-src 'self' data:; " +
      "connect-src 'self'; " +
      "worker-src 'self' blob:; " +
      "frame-ancestors 'self'"
    );
  }
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Global middleware to normalize snake_case request bodies to camelCase + convert date strings
// This ensures frontend snake_case payloads work with backend camelCase validation
const DATE_FIELDS = [
  'reviewedAt', 'appliedAt', 'activatedAt', 'createdAt', 'updatedAt',
  'completedAt', 'scheduledDate', 'customDate', 'verifiedAt', 'expiresAt',
  'lastActiveAt', 'passwordChangedAt', 'scheduleConfirmedAt'
];

function toCamelCase(obj: any): any {
  if (obj === null || typeof obj \!== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  return Object.keys(obj).reduce((result: any, key) => {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = toCamelCase(obj[key]);
    return result;
  }, {});
}

function normalizeRequestBody(obj: any): any {
  if (obj === null || typeof obj \!== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(normalizeRequestBody);

  const camelCased = toCamelCase(obj);

  for (const field of DATE_FIELDS) {
    if (camelCased[field] && typeof camelCased[field] === 'string') {
      const date = new Date(camelCased[field]);
      if (\!isNaN(date.getTime())) {
        camelCased[field] = date;
      }
    }
  }

  return camelCased;
}

app.use((req, res, next) => {
  if (['POST', 'PATCH', 'PUT'].includes(req.method) && req.body && typeof req.body === 'object') {
    req.body = normalizeRequestBody(req.body);
  }
  next();
});

const PgSession = connectPgSimple(session);
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

app.use(session({
  store: new PgSession({
    pool,
    tableName: 'session',
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET || "swaprunn-secret-key-change-in-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  }
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  registerRoutes(app);
  registerUploadRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app);
  } else {
    serveStatic(app);
  }

  // Use PORT env var (required by Railway/Render) with fallback to 5000
  const port = parseInt(process.env.PORT || '5000', 10);
  app.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
