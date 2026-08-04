import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class ApplyDto {
  @ApiProperty({ example: 'I am highly experienced for this role...', description: 'Cover letter for the audition' })
  @IsString()
  @IsNotEmpty()
  coverLetter: string;
}
