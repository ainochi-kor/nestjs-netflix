import {
  CallHandler,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
  NestInterceptor,
} from '@nestjs/common';
import { delay, Observable, tap } from 'rxjs';
import { Request } from 'express';

@Injectable()
export class ResponseTimeInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<any> | Promise<Observable<any>> {
    const req: Request = context.switchToHttp().getRequest<Request>();

    const reqTime = Date.now();

    return next.handle().pipe(
      delay(1000), // 인위적으로 지연시간 추가
      tap(() => {
        const resTime = Date.now();
        const diff = resTime - reqTime;

        if (diff > 1000) {
          console.log(`TIMEOUT: [${req.method} ${req.path}] ${diff}ms`);
          throw new InternalServerErrorException('Request Timeout');
        } else {
          console.log(`[${req.method} ${req.path}] ${diff}ms`);
        }
      }),
    );
  }
}
