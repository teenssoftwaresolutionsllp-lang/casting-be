import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePhotoDto {
  @ApiProperty({ example: 'Portrait', description: 'Photo category, e.g., Portrait, Fashion, Commercial, Editorial' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: 'Minimal Portrait Session', description: 'Photo title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A cinematic portrait with soft lighting and a confident expression.', description: 'Photo description' })
  @IsString()
  @IsNotEmpty()
  desc: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', description: 'Photo file URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/thumb.jpg', description: 'Photo thumbnail URL' })
  @IsString()
  @IsNotEmpty()
  thumb: string;
}
