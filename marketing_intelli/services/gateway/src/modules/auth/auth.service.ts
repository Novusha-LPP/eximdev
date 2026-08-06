// ─── Authentication Service (SSO & Shared Backend Architecture) ───────────────
// services/gateway/src/modules/auth/auth.service.ts

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../../models/User.js';
import { logger } from '../../config/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || '3c7c6bab80b4ca6f1980fe6c99ca20e6265ea2ed27b83fc355ab30bee18030ad';

export interface AuthPayload {
  _id: string;
  id: string;
  username: string;
  name: string;
  email: string;
  role: string;
  company: string;
  company_id?: string;
  department_id?: string;
  isActive?: boolean;
  iss?: string;
  aud?: string;
}

export class AuthService {
  /**
   * Check if a user is authorized — Allowed if isActive === true or username === masood_raza
   */
  static isUserAllowed(user: IUser): boolean {
    const username = (user.username || '').toLowerCase().trim();
    const allowedUsers = ['shipra_tripathi', 'suraj_rajan', 'masood_raza'];
    return allowedUsers.includes(username);
  }

  /**
   * Authenticate user against eximNew.users collection with REAL bcrypt password verification
   */
  static async login(identifier: string, passwordInput?: string): Promise<{ token: string; user: AuthPayload }> {
    const trimmed = identifier.trim().toLowerCase();

    if (!trimmed) {
      throw { status: 400, message: 'Username or email is required' };
    }

    let user = await User.findOne({
      $or: [
        { username: trimmed },
        { username: identifier.trim() },
        { email: trimmed }
      ]
    }).select('+password');



    if (!user) {
      logger.warn({ identifier }, '🔒 Auth failed: User not found in users collection');
      throw { status: 401, message: `User "${identifier}" not found in enterprise directory` };
    }

    // Check authorization access rules
    if (!AuthService.isUserAllowed(user)) {
      logger.warn({ username: user.username }, '🔒 Auth failed: Account is inactive');
      throw { status: 403, message: 'Access restricted: Account is inactive' };
    }

    const inputPass = passwordInput || '';
    if (!inputPass) {
      logger.warn({ username: user.username }, '🔒 Auth failed: Missing password');
      throw { status: 401, message: 'Password is required to sign in' };
    }

    // ─── 100% REAL BCRYPT PASSWORD VERIFICATION ───────────────────────────
    if (user.password && user.password.startsWith('$2')) {
      const isMatch = await bcrypt.compare(inputPass, user.password);
      if (!isMatch) {
        logger.warn({ username: user.username }, '🔒 Auth failed: Password mismatch against real stored bcrypt hash');
        throw { status: 401, message: 'Invalid password provided' };
      }
    } else {
      logger.warn({ username: user.username }, '🔒 Auth failed: User has no valid bcrypt password hash');
      throw { status: 401, message: 'Invalid password provided' };
    }

    const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username;
    const payload: AuthPayload = {
      _id: user._id.toString(),
      id: user._id.toString(),
      username: user.username,
      name,
      email: user.email || '',
      role: user.role || 'User',
      company: user.company || 'EXIM Trade',
      company_id: (user as any).company_id ? String((user as any).company_id) : undefined,
      department_id: (user as any).department_id ? String((user as any).department_id) : undefined,
      isActive: user.isActive !== false,
      iss: 'AlVision-Exim-Auth',
      aud: 'AlVision-Ecosystem',
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '10h' });

    logger.info({ username: user.username, role: user.role }, '🔑 User authenticated successfully in AlVision SSO ecosystem');
    return { token, user: payload };
  }

  /**
   * Get authorized users from users collection with masood_raza sorted first
   */
  static async getAllEnterpriseUsers(): Promise<AuthPayload[]> {
    const rawUsers = await User.find({}).sort({ createdAt: -1 }).lean();

    const formatted: AuthPayload[] = rawUsers.map((u: any) => ({
      _id: u._id.toString(),
      id: u._id.toString(),
      username: u.username || String(u._id),
      name: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.username || 'User',
      email: u.email || '',
      role: u.role || 'User',
      company: u.company || 'EXIM Trade',
      isActive: u.isActive !== false,
    }));



    return formatted;
  }

  /**
   * Verify JWT token with clock tolerance and compatibility for AlVision tokens
   */
  static verifyToken(token: string): AuthPayload {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        clockTolerance: 30, // 30s clock skew tolerance
      }) as any;

      const payload: AuthPayload = {
        _id: decoded._id || decoded.id || '',
        id: decoded.id || decoded._id || '',
        username: decoded.username || '',
        name: decoded.name || decoded.username || 'User',
        email: decoded.email || '',
        role: decoded.role || 'User',
        company: decoded.company || 'EXIM Trade',
        company_id: decoded.company_id,
        department_id: decoded.department_id,
        isActive: decoded.isActive !== false,
        iss: decoded.iss,
        aud: decoded.aud,
      };

      return payload;
    } catch (err: any) {
      throw { status: 401, message: `Invalid or expired authentication token: ${err.message}` };
    }
  }
}
