import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

export const ROLES_KEY = 'roles'

/** Decora um método ou controller com as roles permitidas */
export function Roles(...roles: string[]): MethodDecorator & ClassDecorator {
  return (target: any, key?: string | symbol, descriptor?: any) => {
    const ref = descriptor ?? target
    Reflect.defineMetadata(ROLES_KEY, roles, ref)
    return ref
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<string[]>(ROLES_KEY, context.getHandler())
    if (!roles || roles.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException('Acesso restrito a: ' + roles.join(', '))
    }
    return true
  }
}
