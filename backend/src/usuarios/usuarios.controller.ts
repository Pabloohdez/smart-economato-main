import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { Roles } from '../auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Roles('admin')
  @Get()
  async getById(@Query('id') id: string) {
    if (!id) return null;
    return this.usuariosService.findByIdOrUsername(id);
  }

  @Public()
  @Post()
  async crear(@Body() body: CreateUsuarioDto) {
    return this.usuariosService.crear({
      usuario: body.usuario,
      password: body.password,
      nombre: body.nombre,
      apellidos: body.apellidos,
      email: body.email,
      telefono: body.telefono,
      rol: 'usuario',
    });
  }
}
