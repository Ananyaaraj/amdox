import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../common/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException("Email already registered");

    // FIX: Hash the password before storing
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.user.create({
      data: { email: dto.email, name: dto.name, password: hashedPassword },
    });

    this.logger.log(`User registered: ${user.email}`);
    return this.generateTokens({ sub: user.id, email: user.email });
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        tenants: {
          include: { tenant: true },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!user) throw new UnauthorizedException("Invalid credentials");
    if (!user.isActive) throw new UnauthorizedException("Account disabled");

    // FIX: Verify password with bcrypt
    if (!user.password) throw new UnauthorizedException("Invalid credentials");
    const passwordValid = await bcrypt.compare(dto.password, user.password);
    if (!passwordValid) throw new UnauthorizedException("Invalid credentials");

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tenantUser = user.tenants[0];
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: tenantUser?.tenantId,
      role: tenantUser?.role,
    };

    this.logger.log(`User logged in: ${user.email}`);
    return this.generateTokens(payload);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: this.config.get("JWT_REFRESH_SECRET") || "fallback_jwt_refresh_secret_key_change_in_production_min_32_chars",
      });
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user || !user.isActive) throw new UnauthorizedException();
      return this.generateTokens({ sub: user.id, email: user.email });
    } catch {
      throw new UnauthorizedException("Invalid refresh token");
    }
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tenants: { include: { tenant: true } } },
    });
    if (!user) throw new NotFoundException("User not found");
    // FIX: Never return the password field
    const { password: _pw, ...safeUser } = user as any;
    return safeUser;
  }

  async switchTenant(userId: string, tenantId: string) {
    const tenantUser = await this.prisma.tenantUser.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
      include: { tenant: true },
    });
    if (!tenantUser) throw new UnauthorizedException("Access denied to tenant");
    return this.generateTokens({ sub: userId, tenantId, role: tenantUser.role });
  }

  private generateTokens(payload: object) {
    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get("JWT_REFRESH_SECRET") || "fallback_jwt_refresh_secret_key_change_in_production_min_32_chars",
      expiresIn: this.config.get("JWT_REFRESH_EXPIRES_IN", "7d"),
    });
    return { accessToken, refreshToken };
  }
}
