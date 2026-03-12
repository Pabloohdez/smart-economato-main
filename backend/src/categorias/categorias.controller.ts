import { Body, Controller, Get, Post } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('categorias')
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Get()
  async listar() {
    return this.categoriasService.findAll();
  }

  @Post()
  async crear(@Body() body: { nombre?: string; descripcion?: string }) {
    if (!body?.nombre) {
      throw new HttpException('Nombre obligatorio', HttpStatus.BAD_REQUEST);
    }
    return this.categoriasService.crear(body.nombre, body.descripcion);
  }
}
