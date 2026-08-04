import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class SendMessageDto {
  @ApiProperty({ example: 'Hello, I loved your recent audition tape!', description: 'The text message to send' })
  @IsString()
  @IsNotEmpty()
  text: string;
}
