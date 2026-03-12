import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuditoriaControllerService } from './auditoria.controller.service';
import { AuthUtilsService } from '../common/auth-utils.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('auditoria')
export class AuditoriaController {
  constructor(
    private readonly service: AuditoriaControllerService,
    private readonly authUtils: AuthUtilsService,
  ) {}

  @Get()
  async obtener(
    @Query('usuario_actual') usuarioActual: string,
    @Query('usuario') usuario: string,
    @Query('accion') accion: string,
    @Query('fecha_desde') fechaDesde: string,
    @Query('fecha_hasta') fechaHasta: string,
    @Query('limite') limite: string,
    @Query('offset') offset: string,
  ) {
    await this.authUtils.requireAdmin(usuarioActual ?? undefined);
    return this.service.obtener({
      usuario: usuario || undefined,
      accion: accion || undefined,
      fecha_desde: fechaDesde || undefined,
      fecha_hasta: fechaHasta || undefined,
      limite: limite ? parseInt(limite, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  @Post()
  async registrar(
    @Body()
    body: {
      usuario_id?: string;
      usuario_nombre?: string;
      accion?: string;
      entidad?: string;
      entidad_id?: number;
      detalles?: Record<string, unknown>;
    },
  ) {
    if (!body?.usuario_id || !body?.accion || !body?.entidad) {
      throw new HttpException(
        'Faltan campos requeridos: usuario_id, accion, entidad',
        HttpStatus.BAD_REQUEST,
      );
    }
    return this.service.registrar({
      usuario_id: body.usuario_id,
      usuario_nombre: body.usuario_nombre,
      accion: body.accion,
      entidad: body.entidad,
      entidad_id: body.entidad_id,
      detalles: body.detalles,
    });
  }
}
