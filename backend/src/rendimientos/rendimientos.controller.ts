import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RendimientosService } from './rendimientos.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateRendimientoDto } from './create-rendimiento.dto';

@Controller('rendimientos')
export class RendimientosController {
  constructor(private readonly rendimientosService: RendimientosService) {}

  @Public()
  @Get()
  async listar(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 100;
    return this.rendimientosService.findAll(isNaN(n) ? 100 : n);
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CreateRendimientoDto | CreateRendimientoDto[]) {
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      throw new HttpException('No hay datos para guardar', HttpStatus.BAD_REQUEST);
    }
    return this.rendimientosService.crear(items as any);
  }

  @Roles('admin')
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    return this.rendimientosService.eliminar(numId);
  }
}
