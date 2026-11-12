import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class OtpPhoneDto {
  @ApiProperty({
    example: '+919876543210',
    description:
      'Indian phone number in 10-digit or +91 format. The backend normalizes it before sending.',
  })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class VerifyPhoneOtpDto extends OtpPhoneDto {
  @ApiProperty({ example: '123456', description: 'OTP received by SMS' })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class OtpSignupDto {
  @ApiProperty({
    example: 'eyJhbGciOi...',
    description: 'Token returned by /auth/otp/verify',
  })
  @IsString()
  @IsNotEmpty()
  signup_token: string;

  @ApiProperty({ example: 'jane_doe' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'jane@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Jane Doe', required: false })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  full_name?: string;

  @ApiProperty({
    example: 'artist',
    enum: ['artist', 'audience'],
    required: false,
  })
  @IsOptional()
  @IsIn(['artist', 'audience'])
  role?: string;
}
