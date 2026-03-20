import { Injectable, UnauthorizedException } from '@nestjs/common';
import { sign, verify } from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { AuthTokenPayload } from './auth.types';

type TokenUser = {
  id: string | number;
  username: string;
  role?: string | null;
  nombre?: string | null;
};

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly expiresIn: SignOptions['expiresIn'];

  constructor() {
    this.jwtSecret = this.requiredEnv('JWT_SECRET');
    this.expiresIn = (process.env.JWT_EXPIRES_IN || '8h') as SignOptions['expiresIn'];
  }

  signToken(user: TokenUser): string {
    return sign(
      {
        sub: String(user.id),
        username: user.username,
        role: user.role ?? 'usuario',
        nombre: user.nombre ?? null,
      },
      this.jwtSecret,
      { expiresIn: this.expiresIn },
    );
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      const payload = verify(token, this.jwtSecret);
      if (typeof payload !== 'object' || payload == null || typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Token inválido');
      }
      return payload as AuthTokenPayload;
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  extractBearerToken(headerValue?: string): string | null {
    if (!headerValue) return null;
    const [scheme, token] = headerValue.split(' ');
    if (scheme !== 'Bearer' || !token) return null;
    return token.trim();
  }

  private requiredEnv(name: string): string {
    const value = process.env[name];
    if (!value || value.trim().length === 0) {
      throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
  }
}
