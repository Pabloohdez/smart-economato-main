import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PedidosService {
  constructor(private readonly db: DatabaseService) {}

  async findAll() {
    const { rows } = await this.db.query(`
      SELECT 
        p.*, 
        pr.nombre as proveedor_nombre, 
        u.username as usuario_nombre,
        (
          SELECT COALESCE(
            json_agg(
              json_build_object(
                'id', pd.id,
                'pedido_id', pd.pedido_id,
                'producto_id', pd.producto_id,
                'cantidad', pd.cantidad,
                'cantidad_recibida', pd.cantidad_recibida,
                'precio_unitario', pd.precio_unitario,
                'producto_nombre', prod.nombre
              )
            ), 
            '[]'::json
          )
          FROM pedido_detalles pd
          LEFT JOIN productos prod ON pd.producto_id = prod.id
          WHERE pd.pedido_id = p.id
        ) as items
      FROM pedidos p
      LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
      LEFT JOIN usuarios u ON p.usuario_id = u.id
      ORDER BY p.fecha_creacion DESC
    `);
    return rows.map((r: Record<string, any>) => ({
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
              
              // Update stock
              await this.db.query(
                'UPDATE productos SET stock = stock + $1 WHERE id = $2',
                [cant, prodId],
              );
              
              // Update cantidad_recibida in pedido_detalles
              await this.db.query(
                'UPDATE pedido_detalles SET cantidad_recibida = COALESCE(cantidad_recibida, 0) + $1 WHERE id = $2',
                [cant, item.detalle_id],
              );
            }
          }
        }
        
        // Check if order is complete
        const { rows: checkRows } = await this.db.query(
          'SELECT SUM(cantidad) as total_pedida, SUM(cantidad_recibida) as total_recibida FROM pedido_detalles WHERE pedido_id = $1',
          [id]
        );
        const totalPedida = Number(checkRows[0].total_pedida || 0);
        const totalRecibida = Number(checkRows[0].total_recibida || 0);
        
        const newEstado = totalRecibida >= totalPedida ? 'RECIBIDO' : 'INCOMPLETO';
        await this.db.query("UPDATE pedidos SET estado = $1 WHERE id = $2", [newEstado, id]);
        
        return { message: 'Pedido verificado, stock y estado actualizados' };
      }
      
      return { message: 'No se recibieron items válidos' };
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

