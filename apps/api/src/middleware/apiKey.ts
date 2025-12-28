/**
 * API Key Authentication Middleware
 * For internal API endpoints used by the Vultr recording server
 */

import type { Context, Next } from 'hono';
import type { Bindings } from '../types';

/**
 * Internal API key authentication middleware
 * Validates X-API-Key header for internal endpoints
 */
export async function apiKeyAuth(
  c: Context<{ Bindings: Bindings }>,
  next: Next
) {
  const apiKey = c.req.header('X-API-Key');

  if (!apiKey) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Missing X-API-Key header',
      },
      401
    );
  }

  const validApiKey = c.env.INTERNAL_API_KEY;

  if (!validApiKey) {
    console.error('INTERNAL_API_KEY is not configured');
    return c.json(
      {
        error: 'Internal Server Error',
        message: 'API key authentication is not properly configured',
      },
      500
    );
  }

  if (apiKey !== validApiKey) {
    return c.json(
      {
        error: 'Forbidden',
        message: 'Invalid API key',
      },
      403
    );
  }

  // API key is valid, proceed to the next handler
  await next();
}
