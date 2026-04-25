import { randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AccountSecurityService } from '../auth/account-security.service';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

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
    const normalizedEmail = dto.email?.trim().toLowerCase() || null;
    if (!normalizedEmail) {
      throw new BadRequestException('El correo electronico es obligatorio para registrar la cuenta.');
    }

    const duplicated = await this.db.query<{ id: string }>(
      `SELECT id
       FROM usuarios
       WHERE username = $1 OR lower(email) = lower($2)
       LIMIT 1`,
      [dto.usuario, normalizedEmail],
    );

    if (duplicated.rows.length > 0) {
      throw new ConflictException('Ya existe una cuenta con ese usuario o correo electronico.');
    }

    const id = randomBytes(4).toString('hex');
    const hashedPassword = await hash(dto.password, 10);

    await this.db.query(
      `INSERT INTO usuarios (id, username, password, nombre, apellidos, email, telefono, role, status, email_verified_at, verification_sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NULL, CURRENT_TIMESTAMP)`,
      [
        id,
        dto.usuario,
        hashedPassword,
        dto.nombre ?? null,
        dto.apellidos ?? null,
        normalizedEmail,
        dto.telefono ?? null,
        dto.rol ?? 'usuario',
        'pending_approval',
      ],
    );

    return {
      id,
      usuario: dto.usuario,
      nombre: dto.nombre ?? null,
      apellidos: dto.apellidos ?? null,
      email: normalizedEmail,
      telefono: dto.telefono ?? null,
      rol: dto.rol ?? 'usuario',
      status: 'pending_approval',
      message: 'Solicitud de alta recibida. Un administrador la revisará pronto.',
    };
  }

  async getPendingRequests() {
    const { rows } = await this.db.query(
      `SELECT id, username, nombre, apellidos, email, telefono, verification_sent_at AS fecha_creacion
       FROM usuarios
       WHERE status = $1
       ORDER BY verification_sent_at DESC NULLS LAST, username ASC`,
      ['pending_approval'],
    );
    return rows;
  }

  async approveRequest(userId: string) {
    const { rows } = await this.db.query(`SELECT id FROM usuarios WHERE id = $1`, [userId]);
    if (rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.db.query(
      `UPDATE usuarios SET status = $1, email_verified_at = CURRENT_TIMESTAMP WHERE id = $2`,
      ['approved', userId],
    );

    return { message: 'Solicitud aprobada. El usuario ya puede acceder al sistema.' };
  }

  async rejectRequest(userId: string) {
    const { rows } = await this.db.query(`SELECT id FROM usuarios WHERE id = $1`, [userId]);
    if (rows.length === 0) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.db.query(`DELETE FROM usuarios WHERE id = $1`, [userId]);

    return { message: 'Solicitud rechazada. El usuario ha sido eliminado.' };
  }
}
