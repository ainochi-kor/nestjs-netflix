import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/user/entities/user.entity';
import { RBAC } from '../decorator/rbac.decorator';

@Injectable()
export class RBACGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const role = this.reflector.get<Role>(RBAC, context.getHandler());

    // Role Enum에 해당하는 값이 데코레이터 가져오기
    if (!Object.values(Role).includes(role)) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user: { role: Role } }>();

    const user = request.user;

    if (!user) {
      return false;
    }

    return (user.role as number) <= 3;
  }
}
