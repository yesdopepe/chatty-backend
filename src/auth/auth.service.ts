import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { LoginDto, RegisterDto, AuthResponse } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  private async generateRefreshToken(): Promise<string> {
    const salt = await bcrypt.genSalt();
    return bcrypt.hash(new Date().getTime().toString(), salt);
  }

  private async generateTokenResponse(user: User): Promise<AuthResponse> {
    const payload = { sub: user.user_id, username: user.username };
    const access_token = await this.jwtService.signAsync(payload);
    const refresh_token = await this.generateRefreshToken();

    user.refresh_token = refresh_token;
    await this.userRepository.save(user);

    return {
      access_token,
      refresh_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    const { username, email, password } = registerDto;

    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: [{ username }, { email }],
    });

    if (existingUser) {
      throw new ConflictException('Username or email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new user
    const user = this.userRepository.create({
      username,
      email,
      password_hash: hashedPassword,
      status: 'offline',
    });

    await this.userRepository.save(user);
    return this.generateTokenResponse(user);
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { email, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Update user status
    user.status = 'online';
    return this.generateTokenResponse(user);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const user = await this.userRepository.findOne({
      where: { refresh_token: refreshToken },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Invalidate the old refresh token immediately
    user.refresh_token = null;
    await this.userRepository.save(user);

    // Generate new tokens
    return this.generateTokenResponse(user);
  }

  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = 'offline';
    user.refresh_token = null;
    await this.userRepository.save(user);
  }
}
