import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { query } from '../db';

export interface AuthRequest extends Request {
  admin?: {
    id: number;
    username: string;
    role: 'superadmin' | 'admin';
  };
}

export interface JwtPayload {
  adminId: number;
  username: string;
  role: 'superadmin' | 'admin';
}

export function authenticateToken(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error('JWT_SECRET not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  jwt.verify(token, secret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }

    const payload = decoded as JwtPayload;
    req.admin = {
      id: payload.adminId,
      username: payload.username,
      role: payload.role,
    };
    next();
  });
}

export function requireSuperadmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.admin) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.admin.role !== 'superadmin') {
    return res.status(403).json({ error: 'Superadmin access required' });
  }

  next();
}

export function generateToken(adminId: number, username: string, role: 'superadmin' | 'admin'): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET not configured');
  }

  return jwt.sign(
    { adminId, username, role } as JwtPayload,
    secret,
    { expiresIn: '7d' }
  );
}
