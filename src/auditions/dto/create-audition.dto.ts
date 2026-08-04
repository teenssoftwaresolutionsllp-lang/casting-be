import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateAuditionDto {
  @ApiProperty({ example: 'Action Movie 2026', description: 'Casting call title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Film', description: 'Audition category, e.g., Film, Ad, Dancer, TV' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Hero (Male, 25-35)', description: 'Seeking role description' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 'Mumbai', description: 'Shoot/audition location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({ example: '₹50,000 - ₹2,00,000', description: 'Compensation package detail' })
  @IsString()
  @IsNotEmpty()
  pay: string;

  @ApiProperty({ example: '2026-12-15', description: 'Submission deadline date string' })
  @IsString()
  @IsNotEmpty()
  deadline: string;

  @ApiProperty({ example: 'Hindi', description: 'Language requirements' })
  @IsString()
  @IsNotEmpty()
  lang: string;

  @ApiProperty({ example: 'Seeking a passionate and physically fit actor to portray the principal protagonist.', description: 'Detailed audition description' })
  @IsString()
  @IsNotEmpty()
  desc: string;
}
