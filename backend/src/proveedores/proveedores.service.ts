import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProveedoresService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const { rows } = await this.db.query('SELECT * FROM proveedores ORDER BY nombre ASC');
    return rows;
  }

  async crear(dto: { nombre: string; contacto?: string; telefono?: string; email?: string; direccion?: string }) {
    await this.db.query(
      `INSERT INTO proveedores (nombre, contacto, telefono, email, direccion) VALUES ($1, $2, $3, $4, $5)`,
      [dto.nombre, dto.contacto ?? null, dto.telefono ?? null, dto.email ?? null, dto.direccion ?? null],
    );
    return { message: 'Proveedor creado' };
  }

  async actualizar(id: number, dto: { nombre: string; contacto?: string; telefono?: string; email?: string; direccion?: string }) {
    const { rowCount } = await this.db.query(
      `UPDATE proveedores SET nombre = $1, contacto = $2, telefono = $3, email = $4, direccion = $5 WHERE id = $6`,
      [dto.nombre, dto.contacto ?? null, dto.telefono ?? null, dto.email ?? null, dto.direccion ?? null, id],
    );
    if (rowCount === 0) throw new Error('Proveedor no encontrado');
    return { message: 'Proveedor actualizado' };
  }

  async eliminar(id: number) {
    const { rowCount } = await this.db.query('DELETE FROM proveedores WHERE id = $1', [id]);
    if (rowCount === 0) throw new Error('Proveedor no encontrado');
    return { message: 'Proveedor eliminado' };
  }
}
