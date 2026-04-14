import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function cleanupOldEntries() {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}

setInterval(cleanupOldEntries, 60000);

export function createRateLimiter(options: {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
}) {
  const { windowMs, maxRequests, keyGenerator } = options;
  
  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator 
      ? keyGenerator(req) 
      : (req.session as any)?.userId || req.ip || 'anonymous';
    
    const now = Date.now();
    const entry = rateLimitStore.get(key);
    
    if (!entry || entry.resetTime < now) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter.toString());
      return res.status(429).json({ 
        error: 'Too many requests, please try again later',
        retryAfter 
      });
    }
    
    entry.count++;
    next();
  };
}

export const pollingRateLimiter = createRateLimiter({
  windowMs: 10000,
  maxRequests: 20,
});

export const authRateLimiter = createRateLimiter({
  windowMs: 60000,
  maxRequests: 10,
});

export const sensitiveRateLimiter = createRateLimiter({
  windowMs: 3600000,
  maxRequests: 5,
});
