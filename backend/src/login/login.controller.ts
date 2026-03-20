import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginService } from './login.service';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/public.decorator';
import { LoginDto } from './dto/login.dto';

@Controller('login')
export class LoginController {
  constructor(
    private readonly loginService: LoginService,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @Post()
  async login(@Body() body: LoginDto) {
    const user = await this.loginService.login(body.username, body.password);
    return {
      token: this.authService.signToken({
        id: String(user.id),
        username: String(user.username),
        role: typeof user.role === 'string' ? user.role : null,
        nombre: typeof user.nombre === 'string' ? user.nombre : null,
      }),
      user,
    };
  }
}
