import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Role } from "@prisma/client";
import { ROLES_KEY } from "../decorators/roles.decorator";

const roleHierarchy: Record<Role, number> = {
  SUPER_ADMIN: 4,
  TENANT_ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
};

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context.switchToHttp().getRequest();

    if (!user) throw new ForbiddenException("Access denied");

    const userRoleLevel = roleHierarchy[user.role as Role] ?? 0;
    const minRequiredLevel = Math.min(...requiredRoles.map((r) => roleHierarchy[r]));

    if (userRoleLevel < minRequiredLevel) {
      throw new ForbiddenException("Insufficient permissions");
    }

    return true;
  }
}
