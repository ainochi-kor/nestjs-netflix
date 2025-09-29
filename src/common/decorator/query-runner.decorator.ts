import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { QueryRunner as TQuryRunner } from 'typeorm';

export const QueryRunner = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TQuryRunner => {
    const request = ctx.switchToHttp().getRequest() satisfies Request & {
      queryRunner?: TQuryRunner;
    };

    if (!request?.queryRunner) {
      throw new InternalServerErrorException('QueryRunner가 없습니다.');
    }

    return request.queryRunner;
  },
);
