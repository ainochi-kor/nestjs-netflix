import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  BadRequestException,
  Inject,
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
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
      next();
      return;
    }

    try {
      const token = this.validateBearerToken(authHeader);

      const blockedToken = await this.cacheManager.get(`BLOCK_TOKEN_${token}`);

      if (blockedToken) {
        throw new UnauthorizedException('차단된 토큰입니다.');
      }

      const tokenKey = `TOKEN_${token}`;

      const cachedPayload = await this.cacheManager.get<{
        id: number;
        role: Role;
      }>(tokenKey);

      if (cachedPayload) {
        req.user = cachedPayload;
        next();
        return;
      }

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

      const expiryDate = new Date(payload['exp'] * 1000);
      const now = new Date();

      const differenceInSeconds =
        (expiryDate.getTime() - now.getTime()) / 1000 - 30; // 30초 여유

      await this.cacheManager.set(
        tokenKey,
        payload,
        Math.max(differenceInSeconds * 1000, 1),
      );

      req.user = payload;
      next();
    } catch (e) {
      if ((e as Error).name === 'TokenExpiredError') {
        throw new UnauthorizedException('토큰이 만료되었습니다.');
      }
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
