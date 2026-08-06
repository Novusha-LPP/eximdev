// ─── Auth Middleware (SSO & Shared Backend Architecture) ───────────────────
// services/gateway/src/middleware/auth.ts

import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../modules/auth/auth.service.js';
import { User } from '../models/User.js';

// Public endpoints that don't require auth
const PUBLIC_PATHS = [
  '/api/mi/auth/login',
  '/api/mi/auth/users',
  '/health'
];

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const path = (req.originalUrl || req.url).split('?')[0];
  
  if (PUBLIC_PATHS.includes(path)) {
    return next();
  }

  try {
    // 1. Extract Token from Subdomain Cookie or Authorization Bearer Header
    let token = undefined;
    
    // Parse cookie manually since cookie-parser is not installed
    if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)token=([^;]*)/);
      if (match) {
        token = match[1];
      }
    }

    const authHeader = req.headers.authorization;
    if (!token && authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    if (token) {
      const userPayload = AuthService.verifyToken(token);
      
      // Enforce authorization for token-based users
      if (!AuthService.isUserAllowed({ username: userPayload.username, isActive: userPayload.isActive } as any)) {
        return res.status(403).json({
          success: false,
          error: 'Access restricted: Account is not authorized for Market Intelligence',
        });
      }

      (req as any).user = userPayload;
      return next();
    }

    // 2. Fallback: Check x-user-username Header
    const customUsername = (req.headers['x-user-username'] || req.headers['x-user-id']) as string;
    if (customUsername) {
      const dbUser = await User.findOne({
        $or: [
          { username: customUsername.trim().toLowerCase() },
          { username: customUsername.trim() }
        ]
      });

      if (dbUser && AuthService.isUserAllowed(dbUser)) {
        (req as any).user = {
          _id: dbUser._id.toString(),
          id: dbUser._id.toString(),
          username: dbUser.username,
          name: `${dbUser.first_name || ''} ${dbUser.last_name || ''}`.trim() || dbUser.username,
          email: dbUser.email || '',
          role: dbUser.role || 'User',
          company: dbUser.company || 'EXIM Trade',
          isActive: dbUser.isActive !== false,
        };
        return next();
      }
    }

    // 3. Reject unauthenticated requests
    return res.status(401).json({
      success: false,
      error: 'Access Denied: No authentication token provided. Please sign in.',
    });
  } catch (error: any) {
    res.status(error.status || 401).json({
      success: false,
      error: error.message || 'Access Denied: Invalid or expired token.',
    });
  }
}
