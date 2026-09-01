import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreatePhotoCommentDto {
  @ApiProperty({ example: 'Beautiful portrait, love the expression.', description: 'Comment text content' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
