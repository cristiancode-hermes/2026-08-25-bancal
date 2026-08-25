import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: { username: string; email: string; password: string }) {
    const exists = await this.users.findOne({
      where: [{ email: dto.email.toLowerCase() }, { username: dto.username.toLowerCase() }],
    });
    if (exists) throw new ConflictException('Usuario o email ya registrado');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = (await this.users.save({
      username: dto.username.toLowerCase().trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      role: 'visitor',
      points: 0,
    } as any)) as User;
    return this.tokenResponse(user);
  }

  async login(dto: { identifier: string; password: string }) {
    const id = dto.identifier.trim().toLowerCase();
    const user = await this.users.findOne({
      where: [{ email: id }, { username: id }],
    });
    if (!user) throw new UnauthorizedException('Credenciales inválidas');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');
    return this.tokenResponse(user);
  }

  async me(userId: string) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { user: this.toAuthUser(user) };
  }

  private tokenResponse(user: User) {
    const payload = { sub: user.id, role: user.role };
    return {
      accessToken: this.jwt.sign(payload),
      user: this.toAuthUser(user),
    };
  }

  toAuthUser(user: User) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      points: user.points,
    };
  }
}
