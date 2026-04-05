import { Body, Controller, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { LoginService } from './login.service';
import { AuthService } from '../auth/auth.service';
import { Public } from '../auth/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

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
    const session = await this.authService.issueSessionTokens({
      id: String(user.id),
      username: String(user.username ?? user.usuario ?? ''),
      role: typeof user.role === 'string' ? user.role : typeof user.rol === 'string' ? user.rol : null,
      nombre: typeof user.nombre === 'string' ? user.nombre : null,
    });

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    };
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    const payload = this.authService.verifyRefreshToken(body.refreshToken);
    const user = await this.loginService.findSessionUserById(payload.sub);
    const session = await this.authService.rotateRefreshToken(body.refreshToken, {
      id: String(user.id),
      username: String(user.username ?? user.usuario ?? ''),
      role: typeof user.role === 'string' ? user.role : typeof user.rol === 'string' ? user.rol : null,
      nombre: typeof user.nombre === 'string' ? user.nombre : null,
    });

    return {
      token: session.token,
      refreshToken: session.refreshToken,
      user,
    };
  }
}
