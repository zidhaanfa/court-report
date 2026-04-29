import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { JwtPayload } from '../../common/types/jwt-payload.type';
import { UserStatus } from '@court-workflow/shared';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(
    email: string,
    password: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Omit<User, 'passwordHash'>;
  }> {
    // 1. Find user by email with roles and permissions (eager load)
    const user = await this.userRepository.findOne({
      where: { email },
      relations: { roles: { permissions: true } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Verify password hash
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 3. Check user status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    // 4. Build JWT payload
    const payload = this.buildJwtPayload(user);

    // 5. Sign tokens
    const accessToken = this.signAccessToken(payload);
    const refreshToken = this.signRefreshToken(payload);

    // 6. Hash refreshToken and save to DB
    await this.storeRefreshToken(user.id, refreshToken);

    // 7. Return response (passwordHash is excluded via @Exclude)
    return { accessToken, refreshToken, user };
  }

  async refresh(token: string): Promise<{ accessToken: string }> {
    // 1. Hash incoming token and lookup
    const tokenHash = this.hashToken(token);
    const storedToken = await this.refreshTokenRepository.findOne({
      where: { tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // 2. Check not revoked and not expired
    if (storedToken.revokedAt) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    // 3. Load user with fresh roles/permissions
    const user = await this.userRepository.findOne({
      where: { id: storedToken.userId },
      relations: { roles: { permissions: true } },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }

    // 4. Sign new access token
    const payload = this.buildJwtPayload(user);
    const accessToken = this.signAccessToken(payload);

    return { accessToken };
  }

  async logout(userId: string, token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.refreshTokenRepository.update(
      { tokenHash, userId },
      { revokedAt: new Date() },
    );
  }

  // ── Private helpers ──────────────────────────────────

  private buildJwtPayload(user: User): JwtPayload {
    return {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      roles: user.roleNames,
      permissions: user.permissions,
    };
  }

  private signAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.accessExpires') as any,
    });
  }

  private signRefreshToken(payload: JwtPayload): string {
    return this.jwtService.sign(
      { sub: payload.sub },
      {
        expiresIn: this.configService.get<string>('jwt.refreshExpires') as any,
      },
    );
  }

  private async storeRefreshToken(
    userId: string,
    token: string,
  ): Promise<void> {
    const tokenHash = this.hashToken(token);

    // Calculate expiry based on config
    const refreshExpires = this.configService.get<string>('jwt.refreshExpires') || '7d';
    const daysMatch = refreshExpires.match(/(\d+)d/);
    const days = daysMatch ? parseInt(daysMatch[1], 10) : 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + days);

    const refreshToken = this.refreshTokenRepository.create({
      userId,
      tokenHash,
      expiresAt,
    });

    await this.refreshTokenRepository.save(refreshToken);
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
