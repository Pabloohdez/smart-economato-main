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

  private static readonly INSECURE_DEFAULTS = [
    'cambia_esto_por_un_secreto_largo_y_aleatorio',
    'changeme',
    'secret',
    'jwt_secret',
  ];

  constructor() {
    const secret = this.requiredEnv('JWT_SECRET');
    if (secret.length < 32) {
      throw new Error(
        'JWT_SECRET demasiado corto (mínimo 32 caracteres). Genera uno seguro con: node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'hex\'))"',
      );
    }
    if (AuthService.INSECURE_DEFAULTS.includes(secret.toLowerCase())) {
      throw new Error(
        'JWT_SECRET tiene un valor por defecto inseguro. Cámbialo por un secreto único y aleatorio.',
      );
    }
    this.jwtSecret = secret;
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
