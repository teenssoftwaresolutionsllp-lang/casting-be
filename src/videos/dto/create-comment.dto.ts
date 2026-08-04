import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Amazing performance! Loved the intensity.', description: 'Comment text content' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
