import { Body, Controller, Get, Param, Post, Put } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateProductoDto } from './create-producto.dto';

@Controller('productos')
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Public()
  @Get()
  async listar() {
    return this.productosService.findAll();
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CreateProductoDto) {
    return this.productosService.crear(body as any);
  }

  @Roles('admin')
  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: CreateProductoDto) {
    if (!id) throw new HttpException('Falta ID', HttpStatus.BAD_REQUEST);
    return this.productosService.actualizar(id, body as any);
  }
}
