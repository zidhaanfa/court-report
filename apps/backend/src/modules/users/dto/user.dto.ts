import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsOptional,
  MinLength,
  IsBoolean,
  IsEnum,
} from 'class-validator';
import { UserStatus } from '@court-workflow/shared';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;
}

export class UpdateUserDto {
  @IsString()
  @IsOptional()
  fullName?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsEnum(UserStatus)
  @IsOptional()
  status?: UserStatus;
}

export class AssignRoleDto {
  @IsString()
  @IsNotEmpty()
  roleId: string;
}
