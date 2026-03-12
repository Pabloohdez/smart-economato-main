import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class ProductosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const { rows } = await this.db.query(`
      SELECT 
        p.id, p.nombre, p.precio, p.stock, p.activo, p.imagen, p.descripcion, p.marca,
        p.preciounitario as "precioUnitario",
        p.stockminimo as "stockMinimo",
        p.categoriaid as "categoriaId",
        p.proveedorid as "proveedorId",
        p.unidadmedida as "unidadMedida",
        p.codigobarras as "codigoBarras",
        p.fechacaducidad as "fechaCaducidad",
        c.nombre as categoria_nombre,
        pr.nombre as proveedor_nombre
      FROM productos p
      LEFT JOIN categorias c ON p.categoriaid = c.id
      LEFT JOIN proveedores pr ON p.proveedorid = pr.id
      ORDER BY p.nombre ASC
    `);
    return rows.map((row: Record<string, unknown>) => {
      const r = { ...row };
      r.categoria = { id: r.categoriaId, nombre: r.categoria_nombre };
      r.proveedor = { id: r.proveedorId, nombre: r.proveedor_nombre };
      r.precio = Number(r.precio);
      r.stock = Number(r.stock);
      r.stockMinimo = Number(r.stockMinimo);
      r.activo = r.activo === true || r.activo === 't' || r.activo === 1 || r.activo === '1';
      delete r.categoria_nombre;
      delete r.proveedor_nombre;
      return r;
    });
  }

  async crear(dto: Record<string, unknown>) {
    const id = (dto.id as string) || randomBytes(4).toString('hex');
    const activo = dto.activo ? true : false;
    await this.db.query(
      `INSERT INTO productos (
        id, nombre, precio, preciounitario, stock, stockminimo,
        categoriaid, proveedorid, unidadmedida, marca, codigobarras,
        fechacaducidad, descripcion, imagen, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [
        id,
        dto.nombre,
        Number(dto.precio),
        dto.precioUnitario ?? null,
        Number(dto.stock ?? 0),
        Number(dto.stockMinimo ?? 0),
        Number(dto.categoriaId ?? 0) || null,
        Number(dto.proveedorId ?? 0) || null,
        dto.unidadMedida ?? null,
        dto.marca ?? null,
        dto.codigoBarras ?? null,
        dto.fechaCaducidad ?? null,
        dto.descripcion ?? null,
        dto.imagen ?? null,
        activo,
      ],
    );
    return { ...dto, id };
  }

  async actualizar(id: string, dto: Record<string, unknown>) {
    const activo = dto.activo ? true : false;
    await this.db.query(
      `UPDATE productos SET
        nombre = $1, precio = $2, preciounitario = $3, stock = $4, stockminimo = $5,
        categoriaid = $6, proveedorid = $7, unidadmedida = $8, marca = $9, codigobarras = $10,
        fechacaducidad = $11, descripcion = $12, imagen = $13, activo = $14
      WHERE id = $15`,
      [
        dto.nombre,
        Number(dto.precio),
        dto.precioUnitario ?? null,
        Number(dto.stock ?? 0),
        Number(dto.stockMinimo ?? 0),
        Number(dto.categoriaId ?? 0) || null,
        Number(dto.proveedorId ?? 0) || null,
        dto.unidadMedida ?? null,
        dto.marca ?? null,
        dto.codigoBarras ?? null,
        dto.fechaCaducidad ?? null,
        dto.descripcion ?? null,
        dto.imagen ?? null,
        activo,
        id,
      ],
    );
    return {};
  }
}
