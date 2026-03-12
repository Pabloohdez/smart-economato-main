import { Injectable, UnauthorizedException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class LoginService {
  constructor(private readonly db: DatabaseService) {}

  async login(username: string, password: string) {
    const { rows } = await this.db.query(
      `SELECT * FROM usuarios WHERE username = $1 AND password = $2`,
      [username, password],
    );
    if (rows.length === 0) {
      throw new UnauthorizedException('Usuario o contraseña incorrectos');
    }
    const user = { ...(rows[0] as Record<string, unknown>) };
    delete user.password;
    return user;
  }
}
