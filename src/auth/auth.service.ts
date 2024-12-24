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
    try {
      const { username, email, password } = registerDto;

      // Check if user exists
      const existingUser = await this.userRepository.findOne({
        where: [{ username }, { email }],
      });

      if (existingUser) {
        if (existingUser.username === username) {
          throw new ConflictException('Username is already taken');
        }
        throw new ConflictException('Email is already registered');
      }

      // Validate password strength
      if (password.length < 6) {
        throw new UnauthorizedException('Password must be at least 6 characters long');
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
    } catch (error) {
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new Error('Registration failed. Please try again later.');
    }
  }

  async login(loginDto: LoginDto): Promise<AuthResponse> {
    try {
      const { username, password } = loginDto;

      // Find user
      const user = await this.userRepository.findOne({
        where: { username },
      });

      if (!user) {
        throw new UnauthorizedException('Invalid username or password');
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, user.password_hash);

      if (!isPasswordValid) {
        throw new UnauthorizedException('Invalid username or password');
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
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Login failed. Please try again later.');
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      const user = await this.userRepository.findOne({
        where: { user_id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      if (user.status === 'offline') {
        throw new ConflictException('User is already logged out');
      }

      user.status = 'offline';
      await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Logout failed. Please try again later.');
    }
  }
}
