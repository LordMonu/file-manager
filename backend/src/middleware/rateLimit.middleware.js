import { ApiError } from '../utils/ApiError.js';

const buckets = new Map();

export function createRateLimiter({ windowMs, maxRequests, keyPrefix = 'global' }) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) {
    throw new Error('windowMs must be a positive number');
  }

  if (!Number.isFinite(maxRequests) || maxRequests <= 0) {
    throw new Error('maxRequests must be a positive number');
  }

  return function rateLimit(req, res, next) {
    const now = Date.now();
    const bucketKey = `${keyPrefix}:${getClientIdentifier(req)}`;
    const bucket = buckets.get(bucketKey);

    if (!bucket || bucket.resetAt <= now) {
      const resetAt = now + windowMs;
      buckets.set(bucketKey, {
        count: 1,
        resetAt,
      });
      setRateLimitHeaders(res, maxRequests, Math.max(0, maxRequests - 1), resetAt);
      return next();
    }

    if (bucket.count >= maxRequests) {
      setRateLimitHeaders(res, maxRequests, 0, bucket.resetAt);
      return next(new ApiError(429, 'Too many requests, please try again later'));
    }

    bucket.count += 1;
    buckets.set(bucketKey, bucket);
    setRateLimitHeaders(res, maxRequests, Math.max(0, maxRequests - bucket.count), bucket.resetAt);
    return next();
  };
}

function getClientIdentifier(req) {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return req.ip || 'unknown';
}

function setRateLimitHeaders(res, limit, remaining, resetAt) {
  res.setHeader('X-RateLimit-Limit', String(limit));
  res.setHeader('X-RateLimit-Remaining', String(remaining));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));
}
