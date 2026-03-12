import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PedidosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const { rows } = await this.db.query(`
      SELECT p.*, pr.nombre as proveedor_nombre, u.username as usuario_nombre
      FROM pedidos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha_creacion DESC
    `);
    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      proveedorId: r.proveedor_id,
      usuarioId: r.usuario_id,
      fechaCreacion: r.fecha_creacion,
    }));
  }

  async findOne(id: number) {
    const { rows: head } = await this.db.query(
      `SELECT p.*, pr.nombre as proveedor_nombre, u.username as usuario_nombre
       FROM pedidos p
       LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
       LEFT JOIN usuarios u ON p.usuario_id = u.id
       WHERE p.id = $1`,
      [id],
    );
    if (head.length === 0) return null;
    const h = head[0] as Record<string, unknown>;
    const pedido: Record<string, unknown> = { ...h, proveedorId: h.proveedor_id };

    const { rows: items } = await this.db.query(
      `SELECT pd.*, p.nombre as producto_nombre
       FROM pedido_detalles pd
       LEFT JOIN productos p ON pd.producto_id = p.id
       WHERE pd.pedido_id = $1`,
      [id],
    );
    pedido.items = items;
    return pedido;
  }

  async crear(body: {
    proveedorId: number;
    total?: number;
    usuarioId?: number | string;
    items?: Array<{ producto_id: string; cantidad: number; precio: number }>;
  }) {
    let userId: string | number | undefined = body.usuarioId;
    if (userId != null) {
      const { rowCount } = await this.db.query('SELECT id FROM usuarios WHERE id = $1', [userId]);
      if (rowCount === 0) userId = undefined;
    }
    if (userId == null) {
      const { rows } = await this.db.query<{ id: string | number }>('SELECT id FROM usuarios LIMIT 1');
      userId = rows.length > 0 ? (rows[0] as { id: string | number }).id : 1;
    }
    const { rows: ins } = await this.db.query(
      `INSERT INTO pedidos (proveedor_id, usuario_id, estado, total) VALUES ($1, $2, 'PENDIENTE', $3) RETURNING id`,
      [body.proveedorId, userId, body.total ?? 0],
    );
    const pedidoId = (ins[0] as { id: number }).id;
    if (body.items?.length) {
      for (const item of body.items) {
        await this.db.query(
          `INSERT INTO pedido_detalles (pedido_id, producto_id, cantidad, precio_unitario) VALUES ($1, $2, $3, $4)`,
          [pedidoId, item.producto_id, item.cantidad, item.precio],
        );
      }
    }
    return { id: pedidoId };
  }

  async actualizar(
    id: number,
    body: {
      accion?: string;
      estado?: string;
      items?: Array<{ detalle_id: number; cantidad_recibida: number }>;
    },
  ) {
    if (body.accion === 'RECIBIR') {
      if (body.items?.length) {
        for (const item of body.items) {
          const cant = Number(item.cantidad_recibida);
          if (cant > 0) {
            const { rows } = await this.db.query(
              'SELECT producto_id FROM pedido_detalles WHERE id = $1',
              [item.detalle_id],
            );
            if (rows.length > 0) {
              const prodId = (rows[0] as { producto_id: string }).producto_id;
              await this.db.query(
                'UPDATE productos SET stock = stock + $1 WHERE id = $2',
                [cant, prodId],
              );
            }
          }
        }
      }
      await this.db.query("UPDATE pedidos SET estado = 'RECIBIDO' WHERE id = $1", [id]);
      return { message: 'Pedido verificado y stock actualizado' };
    }
    if (body.accion === 'CANCELAR') {
      await this.db.query("UPDATE pedidos SET estado = 'CANCELADO' WHERE id = $1", [id]);
      return { message: 'Pedido rechazado' };
    }
    const estado = body.estado ?? 'PENDIENTE';
    await this.db.query('UPDATE pedidos SET estado = $1 WHERE id = $2', [estado, id]);
    return { message: 'Estado actualizado' };
  }
}
