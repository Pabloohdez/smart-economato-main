import { randomBytes } from 'crypto';
import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { AuditoriaService, ACCION_BAJA } from '../common/auditoria.service';

const ENTIDAD_BAJA = 'baja';

@Injectable()
export class BajasService {
  constructor(
    private readonly db: DatabaseService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async findAll(mes?: number, anio?: number) {
    let sql = `
      SELECT b.id, b.fecha_baja as "fechaBaja", b.tipo_baja as "tipoBaja", b.cantidad, b.motivo,
             b.usuario_id as "usuarioId", b.producto_id as "productoId",
             p.nombre as producto_nombre, p.precio as producto_precio, u.username as usuario_nombre
      FROM bajas b
      LEFT JOIN productos p ON b.producto_id = p.id
      LEFT JOIN usuarios u ON b.usuario_id = u.id
    `;
    const params: unknown[] = [];
    if (mes != null || anio != null) {
      sql += ' WHERE EXTRACT(MONTH FROM b.fecha_baja) = $1 AND EXTRACT(YEAR FROM b.fecha_baja) = $2';
      params.push(mes ?? new Date().getMonth() + 1, anio ?? new Date().getFullYear());
    }
    sql += ' ORDER BY b.fecha_baja DESC LIMIT 100';
    const { rows } = await this.db.query(sql, params.length ? params : undefined);
    return rows.map((r: Record<string, unknown>) => ({
      ...r,
      cantidad: Number(r.cantidad),
      producto_precio: Number(r.producto_precio),
    }));
  }

  async crear(
    body: {
      productoId: string;
      cantidad: number;
      tipoBaja: string;
      motivo?: string;
      usuarioId?: string;
      fechaBaja?: string;
    },
    ip?: string,
  ) {
    const productoId = body.productoId;
    const cantidad = Number(body.cantidad);
    const tipoBaja = body.tipoBaja;
    const motivo = body.motivo ?? 'Sin especificar';
    const fechaBaja = body.fechaBaja ?? new Date().toISOString();

    // Resolver un usuario válido igual que en pedidos
    let usuarioId: string | number | undefined = body.usuarioId;

    if (usuarioId != null) {
      const { rowCount } = await this.db.query(
        'SELECT id FROM usuarios WHERE id = $1',
        [usuarioId],
      );
      if (rowCount === 0) usuarioId = undefined;
    }

    if (usuarioId == null) {
      const { rows } = await this.db.query<{ id: string | number }>(
        'SELECT id FROM usuarios LIMIT 1',
      );
      if (rows.length === 0) {
        throw new Error('No existe ningún usuario válido para registrar la baja');
      }
      usuarioId = rows[0].id;
    }

    const result = await this.db.transaction(async (client) => {
      const { rows: prod } = await client.query(
        'SELECT stock, precio, nombre FROM productos WHERE id = $1 FOR UPDATE',
        [productoId],
      );

      if (prod.length === 0) throw new Error('Producto no encontrado');

      const stockActual = Number(prod[0].stock);

      if (stockActual < cantidad) {
        throw new Error(
          `Stock insuficiente (disponible: ${stockActual}, solicitado: ${cantidad})`,
        );
      }

      let cantidadPendiente = cantidad;

      // Si la baja es por caducidad, restamos primero de los lotes caducados
      if (tipoBaja.toLowerCase() === 'caducado') {
        const { rows: lotesCaducados } = await client.query(
          `
          SELECT id, cantidad, fecha_caducidad
          FROM lotes_producto
          WHERE producto_id = $1
            AND cantidad > 0
            AND fecha_caducidad IS NOT NULL
            AND fecha_caducidad < CURRENT_DATE
          ORDER BY fecha_caducidad ASC
          FOR UPDATE
          `,
          [productoId],
        );

        const totalCaducado = lotesCaducados.reduce(
          (sum, lote: any) => sum + Number(lote.cantidad),
          0,
        );

        // Si hay lotes caducados, usamos lotes como fuente de verdad
        if (lotesCaducados.length > 0) {
          if (totalCaducado < cantidad) {
            throw new Error(
              `No hay suficiente cantidad caducada en lotes (caducado: ${totalCaducado}, solicitado: ${cantidad})`,
            );
          }

          for (const lote of lotesCaducados as Array<{ id: number; cantidad: number }>) {
            if (cantidadPendiente <= 0) break;

            const cantidadLote = Number(lote.cantidad);
            const descontar = Math.min(cantidadPendiente, cantidadLote);
            const nuevaCantidad = cantidadLote - descontar;

            await client.query(
              'UPDATE lotes_producto SET cantidad = $1 WHERE id = $2',
              [nuevaCantidad, lote.id],
            );

            cantidadPendiente -= descontar;
          }

          const { rows: minRows } = await client.query(
            `
            SELECT MIN(fecha_caducidad) as min_fecha
            FROM lotes_producto
            WHERE producto_id = $1
              AND cantidad > 0
              AND fecha_caducidad IS NOT NULL
            `,
            [productoId],
          );

          const minFecha = (minRows?.[0] as any)?.min_fecha ?? null;

          await client.query(
            'UPDATE productos SET fechacaducidad = $1 WHERE id = $2',
            [minFecha, productoId],
          );
        } else {
          // Fallback legacy: si no hay lotes, permitimos la baja usando la fecha del producto
          const { rows: productoRows } = await client.query(
            'SELECT fechacaducidad FROM productos WHERE id = $1',
            [productoId],
          );

          const fechaProducto = (productoRows?.[0] as any)?.fechacaducidad ?? null;

          if (!fechaProducto) {
            throw new Error('El producto no tiene lotes ni fecha de caducidad registrada');
          }

          const fecha = new Date(fechaProducto);
          const hoy = new Date();
          hoy.setHours(0, 0, 0, 0);

          if (Number.isNaN(fecha.getTime()) || fecha >= hoy) {
            throw new Error('El producto no está realmente caducado');
          }
        }

        for (const lote of lotesCaducados as Array<{ id: number; cantidad: number }>) {
          if (cantidadPendiente <= 0) break;

          const cantidadLote = Number(lote.cantidad);
          const descontar = Math.min(cantidadPendiente, cantidadLote);
          const nuevaCantidad = cantidadLote - descontar;

          await client.query(
            'UPDATE lotes_producto SET cantidad = $1 WHERE id = $2',
            [nuevaCantidad, lote.id],
          );

          cantidadPendiente -= descontar;
        }

        // Recalcular próxima fecha de caducidad real del producto
        const { rows: minRows } = await client.query(
          `
          SELECT MIN(fecha_caducidad) as min_fecha
          FROM lotes_producto
          WHERE producto_id = $1
            AND cantidad > 0
            AND fecha_caducidad IS NOT NULL
          `,
          [productoId],
        );

        const minFecha = (minRows?.[0] as any)?.min_fecha ?? null;

        await client.query(
          'UPDATE productos SET fechacaducidad = $1 WHERE id = $2',
          [minFecha, productoId],
        );
      }

      const nuevoStock = stockActual - cantidad;
      const bajaId = randomBytes(4).toString('hex');

      await client.query(
        `INSERT INTO bajas (id, producto_id, usuario_id, tipo_baja, cantidad, motivo, fecha_baja)
        VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [bajaId, productoId, usuarioId, tipoBaja, cantidad, motivo, fechaBaja],
      );

      if (nuevoStock <= 0) {
        await client.query(
          'UPDATE productos SET stock = $1, fechacaducidad = NULL WHERE id = $2',
          [nuevoStock, productoId],
        );
      } else {
        await client.query(
          'UPDATE productos SET stock = $1 WHERE id = $2',
          [nuevoStock, productoId],
        );
      }

      return {
        bajaId,
        nuevoStock,
        productoNombre: prod[0].nombre,
        usuarioId,
      };
    });

    await this.auditoria.registrar(
      String(result.usuarioId),
      null,
      ACCION_BAJA,
      ENTIDAD_BAJA,
      null,
      {
        tipo: tipoBaja,
        producto: result.productoNombre,
        cantidad,
        motivo,
      },
      ip,
    );

    return {
      id: result.bajaId,
      stockNuevo: result.nuevoStock,
      message: 'Baja registrada correctamente',
    };
  }

  async getWeeklyPercentage(): Promise<{ percentage: number }> {
    // Calculate weekly shrinkage percentage (simplified for demo purposes)
    // Returns a percentage based on bajas this week
    const { rows } = await this.db.query(
      `SELECT 
        COALESCE(SUM(CAST(cantidad AS NUMERIC)), 0) as total_bajas
       FROM bajas 
       WHERE fecha_baja >= CURRENT_DATE - INTERVAL '7 days'`,
    );
    
    // Simplified: return a fixed percentage for now
    // In production, this would calculate against actual stock movements
    const percentage = -2;
    return { percentage };
  }
}
