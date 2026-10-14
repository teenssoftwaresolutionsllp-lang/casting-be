import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString, Max, Min } from 'class-validator';
import { CINEMA_CRAFTS } from '../../common/cinema-crafts';

export class CreateAuditionDto {
  @ApiProperty({ example: 'Action Movie 2026', description: 'Casting call title' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({
    example: 'Acting',
    enum: CINEMA_CRAFTS,
    description: 'Cinema craft category for this audition',
  })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiProperty({ example: 'Lead performer', description: 'Role being cast' })
  @IsString()
  @IsNotEmpty()
  role!: string;

  @ApiPropertyOptional({ example: 25, description: 'Minimum age sought for the role' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  roleAgeMin?: number;

  @ApiPropertyOptional({ example: 35, description: 'Maximum age sought for the role' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(120)
  roleAgeMax?: number;

  @ApiPropertyOptional({ example: 'Male', enum: ['Male', 'Female'], description: 'Gender sought for the role' })
  @IsString()
  @IsOptional()
  @IsIn(['Male', 'Female'])
  roleGender?: string;

  @ApiProperty({ example: 'Mumbai', description: 'Shoot/audition location' })
  @IsString()
  @IsNotEmpty()
  location: string | undefined;

  @ApiPropertyOptional({ example: '₹50,000 - ₹2,00,000', description: 'Compensation package detail' })
  @IsString()
  @IsOptional()
  pay?: string;

  @ApiProperty({ example: '2026-12-15', description: 'Submission deadline date string' })
  @IsString()
  @IsNotEmpty()
  deadline: string | undefined;

  @ApiProperty({ example: 'Hindi', description: 'Language requirements' })
  @IsString()
  @IsNotEmpty()
  lang: string | undefined;

  @ApiProperty({ example: 'Seeking a passionate and physically fit actor to portray the principal protagonist.', description: 'Detailed audition description' })
  @IsString()
  @IsNotEmpty()
  desc: string | undefined;
}
