import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Get()
  async listar() {
    return this.productosService.findAll();
  }

  @Post()
  async crear(@Body() body: Record<string, unknown>) {
    if (!body?.nombre || body?.precio === undefined) {
      throw new HttpException('Datos incompletos', HttpStatus.BAD_REQUEST);
    }
    return this.productosService.crear(body);
  }

  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    if (!id) throw new HttpException('Falta ID', HttpStatus.BAD_REQUEST);
    return this.productosService.actualizar(id, body);
  }
}
