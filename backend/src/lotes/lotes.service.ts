import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class LotesService {
  private ensured = false;

  constructor(private readonly db: DatabaseService) {}

  private async ensureTable() {
    if (this.ensured) return;
    await this.db.query(`
      CREATE TABLE IF NOT EXISTS lotes_producto (
        id SERIAL PRIMARY KEY,
        producto_id VARCHAR NOT NULL REFERENCES productos(id),
        pedido_id INTEGER NULL REFERENCES pedidos(id),
        detalle_id INTEGER NULL REFERENCES detalles_pedido(id),
        fecha_caducidad DATE NULL,
        cantidad NUMERIC(14,3) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    this.ensured = true;
  }

  async listar() {
    await this.ensureTable();
    const { rows } = await this.db.query<{
      id: number;
      productoId: string;
      pedidoId: number | null;
      detalleId: number | null;
      fechaCaducidad: string | null;
      cantidad: number;
    }>(
      `SELECT
        id,
        producto_id as "productoId",
        pedido_id as "pedidoId",
        detalle_id as "detalleId",
        fecha_caducidad as "fechaCaducidad",
        cantidad
       FROM lotes_producto
       WHERE cantidad > 0
       ORDER BY fecha_caducidad ASC NULLS LAST, id ASC`,
    );
    return rows.map((r) => ({ ...r, cantidad: Number((r as any).cantidad) }));
  }

  async crear(input: { productoId: string; fechaCaducidad: string | null; cantidad: number }) {
    await this.ensureTable();
    const { rows } = await this.db.query<{
      id: number;
      productoId: string;
      pedidoId: number | null;
      detalleId: number | null;
      fechaCaducidad: string | null;
      cantidad: number;
    }>(
      `INSERT INTO lotes_producto (producto_id, fecha_caducidad, cantidad)
       VALUES ($1, $2, $3)
       RETURNING
        id,
        producto_id as "productoId",
        pedido_id as "pedidoId",
        detalle_id as "detalleId",
        fecha_caducidad as "fechaCaducidad",
        cantidad`,
      [input.productoId, input.fechaCaducidad, input.cantidad],
    );
    const row = rows[0];
    return { ...row, cantidad: Number((row as any).cantidad) };
  }

  async crearBatch(inputs: Array<{ productoId: string; fechaCaducidad: string | null; cantidad: number }>) {
    await this.ensureTable();
    return this.db.transaction(async (client) => {
      const created: any[] = [];
      for (const input of inputs) {
        const res = await client.query(
          `INSERT INTO lotes_producto (producto_id, fecha_caducidad, cantidad)
           VALUES ($1, $2, $3)
           RETURNING
            id,
            producto_id as "productoId",
            pedido_id as "pedidoId",
            detalle_id as "detalleId",
            fecha_caducidad as "fechaCaducidad",
            cantidad`,
          [input.productoId, input.fechaCaducidad, input.cantidad],
        );
        const row = res.rows[0];
        created.push({ ...row, cantidad: Number((row as any).cantidad) });
      }
      return created;
    });
  }
}

