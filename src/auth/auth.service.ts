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

    // Generate JWT
    const payload = { sub: user.user_id, username: user.username };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    const { username, password } = loginDto;

    // Find user
    const user = await this.userRepository.findOne({
      where: { username },
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
    await this.userRepository.save(user);

    // Generate JWT
    const payload = { sub: user.user_id, username: user.username };
    const access_token = await this.jwtService.signAsync(payload);

    return {
      access_token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
      },
    };
  }

  async logout(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = 'offline';
    await this.userRepository.save(user);
  }
}
