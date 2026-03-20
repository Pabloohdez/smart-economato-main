import { Body, Controller, Get, Param, Post, Put, Req } from '@nestjs/common';
import { PedidosService } from './pedidos.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('pedidos')
export class PedidosController {
  constructor(private readonly pedidosService: PedidosService) {}

  @Get()
  async listar() {
    return this.pedidosService.findAll();
  }

  @Get(':id')
  async uno(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    const pedido = await this.pedidosService.findOne(numId);
    if (!pedido) throw new HttpException('Pedido no encontrado', HttpStatus.NOT_FOUND);
    return pedido;
  }

  @Post()
  async crear(@Body() body: Record<string, unknown>, @Req() req: AuthenticatedRequest) {
    if (!body?.proveedorId) {
      throw new HttpException('Falta proveedor', HttpStatus.BAD_REQUEST);
    }
    return this.pedidosService.crear({
      proveedorId: Number(body.proveedorId),
      total: Number(body.total ?? 0),
      usuarioId: req.user?.sub,
      items: body.items as Array<{ producto_id: string; cantidad: number; precio: number }> | undefined,
    });
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body()
    body: {
      accion?: string;
      estado?: string;
      items?: Array<{ detalle_id: number; cantidad_recibida: number }>;
    },
  ) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('Falta ID', HttpStatus.BAD_REQUEST);
    return this.pedidosService.actualizar(numId, body);
  }
}
