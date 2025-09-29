import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

export const UserId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest() satisfies Request & {
      user?: { sub: number };
    };
    if (!request?.user?.sub) {
      throw new UnauthorizedException('User ID not found');
    }

    return request.user.sub;
  },
);
