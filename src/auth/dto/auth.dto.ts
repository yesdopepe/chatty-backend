import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

export class AuthResponse {
  access_token: string;
  refresh_token: string;
  user: {
    user_id: string;
    username: string;
    email: string;
  };
}

export class RefreshTokenDto {
  @IsString()
  @IsNotEmpty()
  refresh_token: string;
}
