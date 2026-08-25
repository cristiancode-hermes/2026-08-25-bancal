import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  CanActivate,
} from '@nestjs/common';

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  return ctx.switchToHttp().getRequest().user;
});

@Injectable()
export class StaffGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const user = ctx.switchToHttp().getRequest().user as { role?: string } | undefined;
    if (!user || (user.role !== 'staff' && user.role !== 'admin')) {
      throw new ForbiddenException('Solo staff');
    }
    return true;
  }
}
