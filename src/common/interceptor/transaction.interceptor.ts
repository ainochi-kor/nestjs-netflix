import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, finalize, from, map, mergeMap, throwError } from 'rxjs';
import { DataSource, QueryRunner } from 'typeorm';

@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  constructor(private readonly dataSource: DataSource) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const req: Request & { queryRunner?: QueryRunner } = context
      .switchToHttp()
      .getRequest();

    const qr = this.dataSource.createQueryRunner();

    await qr.connect();
    await qr.startTransaction();

    req.queryRunner = qr;

    return next.handle().pipe(
      // 성공 시: 커밋을 기다린 다음 원래 data 반환
      mergeMap((data) =>
        from(qr.commitTransaction()).pipe(map(() => data as unknown)),
      ),
      // 에러 시: 롤백을 기다린 뒤 에러 재발행
      catchError((err) =>
        from(qr.rollbackTransaction()).pipe(
          mergeMap(() => throwError(() => err as unknown)),
        ),
      ),
      // 항상: 커넥션 해제 (Promise 반환 막기 위해 void)
      finalize(() => {
        void qr.release();
      }),
    );
  }
}
