import { Body, Controller, Post } from '@nestjs/common';
import { LoginService } from './login.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@Controller('login')
export class LoginController {
  constructor(private readonly loginService: LoginService) {}

  @Post()
  async login(@Body() body: { username?: string; password?: string }) {
    if (!body?.username || !body?.password) {
      throw new HttpException('Faltan datos', HttpStatus.BAD_REQUEST);
    }
    const user = await this.loginService.login(body.username, body.password);
    return user;
  }
}
