import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateAuditionDto {
  @ApiProperty({ example: 'Action Movie 2026', description: 'Casting call title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Direction',
    description: 'One of the 24 cinema crafts (e.g., Direction or Story / Scriptwriting)',
  })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Lead performer', description: 'Role being cast' })
  @IsString()
  @IsNotEmpty()
  role: string;

  @ApiProperty({ example: 25, description: 'Minimum age sought for the role' })
  @IsInt()
  @Min(1)
  @Max(120)
  roleAgeMin: number;

  @ApiProperty({ example: 35, description: 'Maximum age sought for the role' })
  @IsInt()
  @Min(1)
  @Max(120)
  roleAgeMax: number;

  @ApiProperty({ example: 'Male', enum: ['Male', 'Female'], description: 'Gender sought for the role' })
  @IsString()
  @IsIn(['Male', 'Female'])
  roleGender: string;

  @ApiProperty({ example: 'Mumbai', description: 'Shoot/audition location' })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiPropertyOptional({ example: '₹50,000 - ₹2,00,000', description: 'Compensation package detail' })
  @IsString()
  @IsOptional()
  pay?: string;

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
