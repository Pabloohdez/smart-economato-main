import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import { RendimientosService } from './rendimientos.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('rendimientos')
export class RendimientosController {
  constructor(private readonly rendimientosService: RendimientosService) {}

  @Get()
  async listar(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 100;
    return this.rendimientosService.findAll(isNaN(n) ? 100 : n);
  }

  @Post()
  async crear(@Body() body: unknown) {
    const items = Array.isArray(body) ? body : [body];
    if (items.length === 0) {
      throw new HttpException('No hay datos para guardar', HttpStatus.BAD_REQUEST);
    }
    return this.rendimientosService.crear(items as any);
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    return this.rendimientosService.eliminar(numId);
  }
}
