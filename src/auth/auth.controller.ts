import {
  Controller,
  Get,
  Headers,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './strategy/local.strategy';
import { JWTAuthGuard } from './strategy/jwt.strategy';
import { Public } from './decorator/public.decorator';

const AUTHORIZATION = 'authorization';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Headers(AUTHORIZATION) token: string) {
    return this.authService.register(token);
  }

  @Public()
  @Post('login')
  loginUser(@Headers(AUTHORIZATION) token: string) {
    return this.authService.login(token);
  }

  @Post('token/access')
  async rotateAccessToken(@Request() req) {
    return {
      accessToken: await this.authService.issueToken(req.user, false),
    };
  }

  @UseGuards(LocalAuthGuard)
  @Post('login/passport')
  async loginUserPassport(@Request() req) {
    return {
      refreshToken: await this.authService.issueToken(req.user, true),
      accessToken: await this.authService.issueToken(req.user, false),
    };
  }

  @UseGuards(JWTAuthGuard)
  @Get('private')
  async private(@Request() req) {
    return req.user;
  }
}
