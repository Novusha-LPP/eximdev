// ─── Auth Routes (Restricted to masood_raza) ───────────────────────────
// services/gateway/src/modules/auth/auth.routes.ts

import { Router, Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';

const router = Router();

// POST /api/mi/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { username, identifier, password } = req.body;
    const userIdentifier = username || identifier;

    if (!userIdentifier) {
      return res.status(400).json({ success: false, error: 'Username is required' });
    }

    const result = await AuthService.login(userIdentifier, password);
    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/mi/auth/users (Returns only masood_raza)
router.get('/users', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const users = await AuthService.getAllEnterpriseUsers();
    return res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/mi/auth/me
router.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ success: false, error: 'Unauthenticated' });
    }
    return res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
});

export const authRoutes = router;
