import createHttpError from 'http-errors';
import logger from "../config/logger.config.js";

/**
 * Sanitizes MongoDB input to prevent NoSQL injection attacks
 * Removes MongoDB operators ($gt, $ne, etc.) and dangerous dot notation
 * Compatible with Express 5.x (doesn't modify read-only req.query)
 *
 * @param {any} obj - Object, array, or primitive to sanitize
 * @returns {any} - Sanitized object with MongoDB operators removed
 *
 * @example
 * sanitizeMongoInput({ $gt: 100, name: "John" }) // Returns: { name: "John" }
 * sanitizeMongoInput({ email: "user@example.com" }) // Returns: { email: "user@example.com" }
 */
const sanitizeMongoInput = (obj) => {
  // Handle null, undefined, or non-objects
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  // Handle arrays - sanitize each element
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeMongoInput(item));
  }

  // Handle Date objects and other special objects
  if (obj instanceof Date || obj instanceof RegExp) {
    return obj;
  }

  // Handle plain objects
  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Prevent prototype pollution keys
      // (e.g. __proto__, constructor, prototype) which can mutate object prototypes
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      // Remove keys that start with $ (MongoDB operators like $gt, $ne, etc.)
      // Also remove keys containing . to prevent dot notation injection
      if (key.startsWith('$') || key.includes('.')) {
        continue; // Skip dangerous keys
      }

      const value = obj[key];
      // Recursively sanitize nested objects and arrays
      if (value && typeof value === 'object') {
        sanitized[key] = sanitizeMongoInput(value);
      } else {
        sanitized[key] = value;
      }
    }
  }
  return sanitized;
};

export default function noSqlInjectionProtection(req, res, next) {
  // Sanitize req.body and req.params only (skip req.query for Express 5.x compatibility)
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeMongoInput(req.body);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeMongoInput(req.params);
  }
  next();
}

export const sanitizeQueryParams = (query) => {
  if (!query || typeof query !== 'object') {
    return {};
  }
  return sanitizeMongoInput({ ...query });
};

const isDangerousKey = (k) => {
  if (!k || typeof k !== 'string') return false;
  return (
    k === '__proto__' ||
    k === 'constructor' ||
    k === 'prototype' ||
    k.startsWith('$') ||
    k.includes('.') ||
    k.includes('[$') ||
    k.startsWith('%24') || // URL-encoded $
    k.includes('[%24') // URL-encoded $ in brackets
  );
};

const getDangerousKeysRecursive = (obj, prefix = '') => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return [];
  const keys = [];
  for (const k of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (isDangerousKey(k)) {
      keys.push(path);
    }
    const v = obj[k];
    if (
      v &&
      typeof v === 'object' &&
      !Array.isArray(v) &&
      !(v instanceof Date) &&
      !(v instanceof RegExp)
    ) {
      keys.push(...getDangerousKeysRecursive(v, path));
    }
  }
  return keys;
};

export const sanitizeQueryParamsWithReport = (query) => {
  if (!query || typeof query !== 'object') {
    return { sanitized: {}, strippedKeys: [] };
  }
  const strippedKeys = getDangerousKeysRecursive(query);
  const sanitized = sanitizeMongoInput({ ...query });
  return { sanitized, strippedKeys };
};

export const getSafeQueryOrFail = (req, res, next) => {
  const { sanitized, strippedKeys } = sanitizeQueryParamsWithReport(req?.query);

  // Debug: log the actual query structure to understand parsing (only in dev)
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Query sanitization check', {
      originalQuery: req?.query,
      strippedKeys,
      queryKeys: req?.query ? Object.keys(req?.query) : [],
      sanitizedKeys: sanitized ? Object.keys(sanitized) : [],
      rawUrl: req?.originalUrl || req?.url,
      queryString: req?.url?.split('?')[1] || ''
    });
  }

  // Express might ignore or strip $ keys, so we need to check the raw URL
  const rawQueryString = req?.url?.split('?')[1] || req?.originalUrl?.split('?')[1] || '';
  if (rawQueryString) {
    // Check for $ operators in the raw query string (before Express parsing)
    const dangerousPatterns = [
      /\$gt[=&#]/,           // $gt=, $gt&, $gt#
      /\$lt[=&#]/,           // $lt=, $lt&, $lt#
      /\$gte[=&#]/,          // $gte=, etc.
      /\$lte[=&#]/,          // $lte=, etc.
      /\$ne[=&#]/,           // $ne=, etc.
      /\$regex[=&#]/,        // $regex=, etc.
      /\$in[=&#]/,           // $in=, etc.
      /\$nin[=&#]/,          // $nin=, etc.
      /\[?\$[a-z]+[=&#]/,   // Any $operator pattern
      /%24[a-z]+[=&#]/i      // URL-encoded $ (%24)
    ];

    const hasDangerousPattern = dangerousPatterns.some(pattern => pattern.test(rawQueryString));

    if (hasDangerousPattern) {
      logger.warn('NoSQL-style query params rejected (detected in raw query string)', {
        rawQueryString,
        path: req.path,
        method: req.method,
        ip: req.ip,
        parsedQuery: req?.query
      });
      next(createHttpError.BadRequest('Invalid query parameters'));
      return null;
    }
  }

  if (strippedKeys.length > 0) {
    logger.warn('NoSQL-style query params rejected', {
      strippedKeys,
      path: req.path,
      method: req.method,
      ip: req.ip,
      originalQuery: req?.query
    });
    next(createHttpError.BadRequest('Invalid query parameters'));
    return null;
  }

  // Additional check: Compare original vs sanitized to catch any keys that were removed
  // This catches cases where Express might parse $gt differently (e.g. URL-encoded as %24gt)
  if (req?.query && sanitized) {
    const originalKeys = Object.keys(req.query);
    const sanitizedKeys = Object.keys(sanitized);
    const removedKeys = originalKeys.filter(k => !sanitizedKeys.includes(k));

    if (removedKeys.length > 0) {
      // Some keys were removed during sanitization - this means they were dangerous
      logger.warn('NoSQL-style query params rejected (detected via comparison)', {
        removedKeys,
        strippedKeys,
        path: req.path,
        method: req.method,
        ip: req.ip,
        originalQuery: req?.query
      });
      next(createHttpError.BadRequest('Invalid query parameters'));
      return null;
    }
  }

  return sanitized;
};