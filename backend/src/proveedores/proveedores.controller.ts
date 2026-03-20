import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { HttpException, HttpStatus } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateProveedorDto, UpdateProveedorDto } from './create-proveedor.dto';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Public()
  @Get()
  async listar() {
    return this.proveedoresService.findAll();
  }

  @Roles('admin')
  @Post()
  async crear(@Body() body: CreateProveedorDto) {
    return this.proveedoresService.crear(body as any);
  }

  @Roles('admin')
  @Put(':id')
  async actualizar(@Param('id') id: string, @Body() body: UpdateProveedorDto) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    return this.proveedoresService.actualizar(numId, body as any);
  }

  @Roles('admin')
  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID obligatorio para eliminar', HttpStatus.BAD_REQUEST);
    return this.proveedoresService.eliminar(numId);
  }
}
