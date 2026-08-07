import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { HashingService } from '../common/hashing/hashing.service';
import { Role } from '../users/types/role.enum';
import { UsersService } from '../users/users.service';
import { LoginResponseDto } from './dto/login-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './types/jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly hashingService: HashingService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<LoginResponseDto> {
    const existing = await this.usersService.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('User already registered');
    }

    const user = await this.usersService.create({
      ...dto,
      password: await this.hashingService.hash(dto.password),
      id: randomUUID(),
    });

    const accessToken = await this.signAccessToken(user.id, user.role);

    return { accessToken, user };
  }

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValid = await this.hashingService.verify(user.password, dto.password);
    if (!isValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { password: _password, ...safeUser } = user.toObject();

    const accessToken = await this.signAccessToken(user.id, user.role);

    return { accessToken, user: safeUser };
  }

  private signAccessToken(userId: string, role: Role): Promise<string> {
    const payload: JwtPayload = { sub: userId, role };
    return this.jwtService.signAsync(payload);
  }
}
