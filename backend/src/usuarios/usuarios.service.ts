import { randomBytes } from 'crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly db: DatabaseService) {}

  async findByIdOrUsername(idOrUsername: string) {
    const { rows } = await this.db.query(
      `SELECT id, username, nombre, apellidos, email, telefono, role FROM usuarios WHERE id = $1 OR username = $1 LIMIT 1`,
      [idOrUsername],
    );
    if (rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return rows[0];
  }

  async crear(dto: {
    usuario: string;
    password: string;
    nombre?: string;
    apellidos?: string;
    email?: string;
    telefono?: string;
    rol?: string;
  }) {
    const id = randomBytes(4).toString('hex');
    await this.db.query(
      `INSERT INTO usuarios (id, username, password, nombre, apellidos, email, telefono, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        id,
        dto.usuario,
        dto.password,
        dto.nombre ?? null,
        dto.apellidos ?? null,
        dto.email ?? null,
        dto.telefono ?? null,
        dto.rol ?? 'usuario',
      ],
    );
    return { id, ...dto };
  }
}
