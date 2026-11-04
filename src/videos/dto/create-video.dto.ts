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

  @ApiProperty({ example: 'videos/c7a1c720-3b98-46cb-8b5e-2b10935d2105.mp4', description: 'Video S3 object key or URL' })
  @IsString()
  @IsNotEmpty()
  url: string;

  @ApiProperty({ example: 'photos/4cfc166d-1bf9-4089-982c-7b838706d871.jpg', description: 'Video thumbnail S3 object key or URL' })
  @IsString()
  @IsNotEmpty()
  thumb: string;
}
