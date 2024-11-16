import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CONFIG } from 'src/common/constants/env.constant';

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: any, res: any, next: (error?: Error | any) => void) {
    /// Basic token

    /// Bearer token

    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return next();
    }

    try {
      const token = this.validateBearerToken(authHeader);

      const decodedPayload = await this.jwtService.decode(token);

      if (
        decodedPayload.type !== 'access' &&
        decodedPayload.type !== 'refresh'
      ) {
        throw new UnauthorizedException('잘못된 토큰입니다!');
      }

      const secretKey =
        decodedPayload.type === 'refresh'
          ? CONFIG.REFRESH_TOKEN_SECRET
          : CONFIG.ACCESS_TOKEN_SECRET;
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.get(secretKey),
      });

      req.user = payload;
      next();
    } catch (error) {
      next();
    }
  }

  validateBearerToken(rawToken: string) {
    const basicSplit = rawToken.split(' ');

    if (basicSplit.length !== 2) {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
    }

    const [type, token] = basicSplit;

    if (type.toLowerCase() !== 'bearer') {
      throw new BadRequestException('토큰 포맷이 잘못되었습니다.');
    }

    return token;
  }
}
