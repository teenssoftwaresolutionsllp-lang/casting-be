import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateVideoDto {
  @ApiProperty({ example: 'Films', description: 'Video category, e.g., Films, Ads, TV, Music Videos' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ example: "Dramatic Monologue: Shakespeare's Hamlet", description: 'Video title' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'A passionate interpretation of classical monologue.', description: 'Video description' })
  @IsString()
  @IsNotEmpty()
  desc: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/video/upload/sample.mp4', description: 'Video file URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: 'https://res.cloudinary.com/demo/image/upload/sample.jpg', description: 'Video thumbnail URL' })
  @IsString()
  @IsNotEmpty()
  thumb: string;
}
