import { Controller, Get, Query } from '@nestjs/common';
import { InformesService } from './informes.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('informes')
export class InformesController {
  constructor(private readonly informesService: InformesService) {}

  @Get()
  async get(
    @Query('tipo') tipo: string,
    @Query('usuario_id') usuarioId: string,
    @Query('fecha_inicio') fechaInicio: string,
    @Query('fecha_fin') fechaFin: string,
  ) {
    const t = tipo || 'dashboard';
    if (t === 'gastos_mensuales') {
      const data = await this.informesService.getGastosMensuales(
        usuarioId || undefined,
        fechaInicio || undefined,
        fechaFin || undefined,
      );
      return { gastos_por_mes: data.gastos_por_mes, total_curso: data.total_curso };
    }
    if (t === 'usuarios') {
      const data = await this.informesService.getUsuarios();
      return data;
    }
    const data = await this.informesService.getDashboard();
    return data;
  }
}
