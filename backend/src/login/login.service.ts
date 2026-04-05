import { compare, hash } from 'bcryptjs';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class LoginService {
  constructor(private readonly db: DatabaseService) {}

  async login(username: string, password: string) {
    const rows = await this.findSessionUsers('u.username = $1', [username]);

    if (rows.length === 0) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    const row = { ...(rows[0] as Record<string, unknown>) };
    const storedPassword = typeof row.password === 'string' ? row.password : '';

    let isValid = false;
    const isBcryptHash = storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$') || storedPassword.startsWith('$2y$');

    if (isBcryptHash) {
      isValid = await compare(password, storedPassword);
    } else {
      isValid = storedPassword === password;
      // Migra contraseñas antiguas en texto plano al nuevo formato hash tras login exitoso.
      if (isValid && row.id) {
        const upgradedHash = await hash(password, 10);
        await this.db.query(`UPDATE usuarios SET password = $1 WHERE id = $2`, [upgradedHash, row.id]);
      }
    }

    if (!isValid) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }

    delete row.password;
    return row;
  }

  async findSessionUserById(id: string) {
    const rows = await this.findSessionUsers('u.id = $1', [id]);
    if (rows.length === 0) {
      throw new UnauthorizedException('Usuario no encontrado');
    }
    const row = { ...(rows[0] as Record<string, unknown>) };
    delete row.password;
    return row;
  }

  private async findSessionUsers(whereClause: string, params: unknown[]) {
    const { rows } = await this.db.query(
      `SELECT
         u.id,
         u.username,
         u.password,
         u.nombre,
         u.apellidos,
         u.email,
         u.telefono,
         u.role,
         COALESCE(array_remove(array_agg(a.nombre ORDER BY a.nombre), NULL), '{}') as alergias
       FROM usuarios u
       LEFT JOIN usuario_alergenos ua ON ua.usuario_id = u.id
       LEFT JOIN alergenos a ON a.id = ua.alergeno_id
       WHERE ${whereClause}
       GROUP BY u.id, u.username, u.password, u.nombre, u.apellidos, u.email, u.telefono, u.role
       LIMIT 1`,
      params,
    );
    return rows;
  }
}
