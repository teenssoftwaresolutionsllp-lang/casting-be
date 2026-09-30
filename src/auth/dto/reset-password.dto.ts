import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Single-use token from the reset email' })
  @IsString()
  @IsNotEmpty()
  @Length(64, 64)
  token!: string;

  @ApiProperty({ example: 'NewPassword123!', minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
