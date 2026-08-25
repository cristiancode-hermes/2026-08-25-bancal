import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty()
  @IsString()
  username!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password!: string;
}

export class LoginDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  login?: string;

  @ApiProperty()
  @IsString()
  password!: string;
}
