/**
 * Clerk Authentication Middleware
 * Validates JWT tokens from Clerk and extracts user information
 */

import { verifyToken } from '@clerk/backend';
import type { Context, Next } from 'hono';
import type { Bindings } from '../types';

/**
 * Extract token from Authorization header
 */
function extractToken(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;

  return parts[1];
}

/**
 * Clerk JWT authentication middleware
 * Validates the token and attaches userId to context
 */
export async function clerkAuth(
  c: Context<{ Bindings: Bindings }>,
  next: Next
) {
  const authHeader = c.req.header('Authorization');
  const token = extractToken(authHeader);

  if (!token) {
    return c.json(
      {
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header',
      },
      401
    );
  }

  try {
    const secretKey = c.env.CLERK_SECRET_KEY;

    if (!secretKey) {
      console.error('CLERK_SECRET_KEY is not configured');
      return c.json(
        {
          error: 'Internal Server Error',
          message: 'Authentication is not properly configured',
        },
        500
      );
    }

    // Verify the Clerk JWT token
    const payload = await verifyToken(token, {
      secretKey,
    });

    // Extract user ID from the token payload
    const userId = payload.sub;

    if (!userId) {
      return c.json(
        {
          error: 'Unauthorized',
          message: 'Invalid token: missing user ID',
        },
        401
      );
    }

    // Attach userId to context for downstream handlers
    c.set('userId', userId);

    await next();
  } catch (error) {
    console.error('Token verification failed:', error);

    return c.json(
      {
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      },
      401
    );
  }
}
