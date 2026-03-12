import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { MovimientosService } from './movimientos.service';
import { Request } from 'express';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('movimientos')
export class MovimientosController {
  constructor(private readonly movimientosService: MovimientosService) {}

  @Get()
  async listar() {
    return this.movimientosService.findAll();
  }

  @Post()
  async crear(@Body() body: Record<string, unknown>, @Req() req: Request) {
    if (!body?.productoId || body?.cantidad == null) {
      throw new HttpException('Faltan datos (productoId o cantidad)', HttpStatus.BAD_REQUEST);
    }
    const ip = req.socket?.remoteAddress;
    return this.movimientosService.crear(
      {
        productoId: String(body.productoId),
        cantidad: Number(body.cantidad),
        tipo: String(body.tipo ?? 'ENTRADA'),
        motivo: body.motivo as string | undefined,
        usuarioId: body.usuarioId as string | undefined,
      },
      ip,
    );
  }
}
