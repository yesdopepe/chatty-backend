import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  ConflictException,
  UnauthorizedException,
  NotFoundException
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, AuthResponse } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponse> {
    try {
      return await this.authService.register(registerDto);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new Error('Registration failed. Please try again later.');
    }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<AuthResponse> {
    try {
      return await this.authService.login(loginDto);
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Login failed. Please try again later.');
    }
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(@Request() req) {
    try {
      await this.authService.logout(req.user.user_id);
      return { message: 'Successfully logged out' };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ConflictException) {
        throw error;
      }
      throw new Error('Logout failed. Please try again later.');
    }
  }
}
