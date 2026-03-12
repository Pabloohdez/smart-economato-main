import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { ProveedoresService } from './proveedores.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('proveedores')
export class ProveedoresController {
  constructor(private readonly proveedoresService: ProveedoresService) {}

  @Get()
  async listar() {
    return this.proveedoresService.findAll();
  }

  @Post()
  async crear(
    @Body() body: { nombre?: string; contacto?: string; telefono?: string; email?: string; direccion?: string },
  ) {
    if (!body?.nombre) {
      throw new HttpException('Nombre obligatorio', HttpStatus.BAD_REQUEST);
    }
    return this.proveedoresService.crear({
      nombre: body.nombre,
      contacto: body.contacto,
      telefono: body.telefono,
      email: body.email,
      direccion: body.direccion,
    });
  }

  @Put(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() body: { nombre?: string; contacto?: string; telefono?: string; email?: string; direccion?: string },
  ) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID inválido', HttpStatus.BAD_REQUEST);
    if (!body?.nombre) {
      throw new HttpException('Nombre obligatorio', HttpStatus.BAD_REQUEST);
    }
    return this.proveedoresService.actualizar(numId, {
      nombre: body.nombre,
      contacto: body.contacto,
      telefono: body.telefono,
      email: body.email,
      direccion: body.direccion,
    });
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) throw new HttpException('ID obligatorio para eliminar', HttpStatus.BAD_REQUEST);
    return this.proveedoresService.eliminar(numId);
  }
}
