import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../../common/prisma/prisma.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService, private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get("JWT_SECRET") || "fallback_jwt_secret_key_change_in_production_min_32_chars",
      ignoreExpiration: false,
    });
  }

  async validate(payload: { sub: string; email: string; tenantId?: string; role?: string }) {
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  }
}
