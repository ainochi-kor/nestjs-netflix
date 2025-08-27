import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { ENV } from 'src/common/const/env.const';
import { Role } from 'src/user/entities/user.entity';

@Injectable()
export class BearerTokenMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      next();
      return;
    }

    try {
      const token = this.validateBearerToken(authHeader);

      const decodedPayload: {
        id: number;
        role: Role;
        type: 'access' | 'refresh';
      } = this.jwtService.decode(token);

      if (
        decodedPayload.type !== 'access' &&
        decodedPayload.role !== Role.user
      ) {
        throw new UnauthorizedException('잘못된 토큰입니다.');
      }

      const isRefreshToken = decodedPayload.type === 'refresh';

      const secret = this.configService.get<string>(
        isRefreshToken ? ENV.REFRESH_TOKEN_SECRET : ENV.ACCESS_TOKEN_SECRET,
      );

      const payload = await this.jwtService.verifyAsync<{
        id: number;
        role: Role;
        type: 'access' | 'refresh';
      }>(token, {
        secret,
      });

      req.user = payload;
      next();
    } catch {
      next();
    }
  }

  validateBearerToken(rawToken: string) {
    const bearerSplit = rawToken.split(' ');

    if (bearerSplit.length !== 2) {
      throw new BadRequestException('올바른 형식의 토큰이 아닙니다.');
    }

    const [bearer, token] = bearerSplit;

    if (bearer.toLowerCase() !== 'bearer') {
      throw new BadRequestException('올바른 형식의 토큰이 아닙니다.');
    }

    return token;
  }
}
