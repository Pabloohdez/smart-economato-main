import { Body, Controller, Get, NotFoundException, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../auth/public.decorator';
import { AccountSecurityService } from '../auth/account-security.service';
import { Roles } from '../auth/roles.decorator';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly accountSecurityService: AccountSecurityService,
  ) {}

  @Roles('admin')
  @Get()
  async getById(@Query('id') id: string) {
    if (!id) return null;
    return this.usuariosService.findByIdOrUsername(id);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
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

  @Public()
  @Get('verify')
  async verify(@Query('token') token?: string) {
    if (!token) {
      throw new NotFoundException('Falta el token de verificacion.');
    }

    return this.accountSecurityService.verifyAccount(token);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('resend-verification')
  async resendVerification(@Body() body: ResendVerificationDto) {
    return this.accountSecurityService.resendVerification(body.email);
  }
}
