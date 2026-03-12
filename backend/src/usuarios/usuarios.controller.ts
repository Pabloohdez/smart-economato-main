import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  async getById(@Query('id') id: string) {
    if (!id) return null;
    return this.usuariosService.findByIdOrUsername(id);
  }

  @Post()
  async crear(
    @Body()
    body: {
      usuario?: string;
      password?: string;
      nombre?: string;
      apellidos?: string;
      email?: string;
      telefono?: string;
      rol?: string;
    },
  ) {
    if (!body?.usuario || !body?.password) {
      throw new Error('Faltan usuario o contraseña');
    }
    return this.usuariosService.crear({
      usuario: body.usuario,
      password: body.password,
      nombre: body.nombre,
      apellidos: body.apellidos,
      email: body.email,
      telefono: body.telefono,
      rol: body.rol,
    });
  }
}
