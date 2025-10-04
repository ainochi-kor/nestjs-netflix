import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  CallHandler,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { Throttle } from '../decorator/throttle.decorator';

@Injectable()
export class ThrottleInterceptor implements NestInterceptor {
  constructor(
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
    private readonly reflector: Reflector,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler<any>,
  ): Promise<Observable<any>> {
    const request: Request & {
      user?: { sub?: number };
    } = context.switchToHttp().getRequest();

    const userId = request?.user?.sub;

    if (!userId) {
      return next.handle();
    }

    const throttleOptions = this.reflector.get<{
      count: number;
      unit: 'minute';
    }>(Throttle, context.getHandler());

    if (!throttleOptions) {
      return next.handle();
    }

    const date = new Date();
    const minute = date.getMinutes();

    const key = `${request.method}_${request.url}_${userId}_${minute}`;

    const count = await this.cacheManager.get<number>(key);
    console.log({
      key,
      count,
    });

    if (count && count >= throttleOptions.count) {
      throw new ForbiddenException('너무 많은 요청을 보냈습니다.');
    }

    return next.handle().pipe(
      tap(() => {
        void this.cacheManager
          .get<number>(key)
          .then((count) => {
            const currentCount = count ?? 0;
            void this.cacheManager.set(key, currentCount + 1, 60000); // 1 minute
          })
          .catch((err) => {
            // Optionally log or handle the error
            console.error('Error updating throttle count:', err);
          });
      }),
    );
  }
}
