import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditoriaService, ACCION_MOVIMIENTO } from '../common/auditoria.service';

const ENTIDAD_MOVIMIENTO = 'movimiento';

@Injectable()
export class MovimientosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async findAll() {
    const { rows } = await this.db.query(`
      SELECT m.id, m.fecha, m.tipo, m.cantidad, m.motivo,
             m.stock_anterior as "stockAnterior", m.stock_nuevo as "stockNuevo",
             p.nombre as producto_nombre, u.username as usuario_nombre
      FROM movimientos m
      LEFT JOIN productos p ON m.producto_id = p.id
      LEFT JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.fecha DESC LIMIT 50
    `);
    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      cantidad: Number(r.cantidad),
    }));
  }

  async crear(
    body: {
      productoId: string;
      cantidad: number;
      tipo: string;
      motivo?: string;
      usuarioId?: string;
    },
    ip?: string,
  ) {
    const productoId = body.productoId;
    const cantidad = Number(body.cantidad);
    const tipo = body.tipo;
    const motivo = body.motivo ?? 'Ajuste manual';
    const usuarioId = body.usuarioId ?? 'admin1';

    const { rows: stockRow } = await this.db.query<{ stock: number }>(
      'SELECT stock FROM productos WHERE id = $1',
      [productoId],
    );
    if (stockRow.length === 0) throw new Error('Producto no encontrado');
    const stockActual = Number(stockRow[0].stock);
    const stockNuevo =
      tipo === 'ENTRADA' ? stockActual + cantidad : stockActual - cantidad;

    await this.db.query(
      `INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, stock_anterior, stock_nuevo, motivo)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [productoId, usuarioId, tipo, cantidad, stockActual, stockNuevo, motivo],
    );
    await this.db.query('UPDATE productos SET stock = $1 WHERE id = $2', [
      stockNuevo,
      productoId,
    ]);

    const { rows: prod } = await this.db.query<{ nombre: string }>(
      'SELECT nombre FROM productos WHERE id = $1',
      [productoId],
    );
    await this.auditoria.registrar(
      usuarioId,
      null,
      ACCION_MOVIMIENTO,
      ENTIDAD_MOVIMIENTO,
      null,
      {
        tipo,
        producto: prod[0]?.nombre,
        cantidad,
        motivo,
        stock_anterior: stockActual,
        stock_nuevo: stockNuevo,
      },
      ip,
    );

    return { message: 'Movimiento registrado', stock_nuevo: stockNuevo };
  }
}
