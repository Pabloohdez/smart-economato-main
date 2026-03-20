import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { BajasService } from './bajas.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import type { AuthenticatedRequest } from '../auth/auth.types';

@Controller('bajas')
export class BajasController {
  constructor(private readonly bajasService: BajasService) {}

  @Get()
  async listar(
    @Query('mes') mes?: string,
    @Query('anio') anio?: string,
  ) {
    const mesNum = mes ? parseInt(mes, 10) : undefined;
    const anioNum = anio ? parseInt(anio, 10) : undefined;
    return this.bajasService.findAll(mesNum, anioNum);
  }

  @Post()
  async crear(@Body() body: Record<string, unknown>, @Req() req: AuthenticatedRequest) {
    if (!body?.productoId || body?.cantidad == null || !body?.tipoBaja) {
      throw new HttpException(
        'Faltan datos obligatorios (productoId, cantidad, tipoBaja)',
        HttpStatus.BAD_REQUEST,
      );
    }
    const ip = req.socket?.remoteAddress;
    return this.bajasService.crear(
      {
        productoId: String(body.productoId),
        cantidad: Number(body.cantidad),
        tipoBaja: String(body.tipoBaja),
        motivo: body.motivo as string | undefined,
        usuarioId: req.user?.sub,
        fechaBaja: body.fechaBaja as string | undefined,
      },
      ip,
    );
  }
}
