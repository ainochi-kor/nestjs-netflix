import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() satisfies Request & {
      user?: { sub: number };
    };

    return request.user?.sub;
  },
);
