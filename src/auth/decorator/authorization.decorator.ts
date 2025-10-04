import { createParamDecorator } from '@nestjs/common';

export const Authorization = createParamDecorator((data: unknown, ctx) => {
  const request: Request = ctx.switchToHttp().getRequest();
  return request.headers['authorization'] as string;
});
