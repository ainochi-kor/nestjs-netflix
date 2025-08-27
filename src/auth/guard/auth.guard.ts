import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Public } from '../decorator/publick.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 만약에 Public 데코레이터가 붙어있다면 모든 로직 pass
    const isPublic = this.reflector.get(Public, context.getHandler());

    if (isPublic) {
      return true;
    }

    // 요청에서 user 객체가 존재하는지 확인한다.
    const request = context
      .switchToHttp()
      .getRequest<{ user?: { type: string } }>();

    if (!request.user || request.user.type !== 'access') {
      return false;
    }
    return true;
  }
}
