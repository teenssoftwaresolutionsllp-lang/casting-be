import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum } from 'class-validator';

export class UpdateApplicationStatusDto {
  @ApiProperty({ example: 'SHORTLISTED', enum: ['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'], description: 'Application status' })
  @IsEnum(['PENDING', 'SHORTLISTED', 'ACCEPTED', 'REJECTED'])
  @IsNotEmpty()
  status: string;

  @ApiProperty({ example: 'Please prepare a 2 minute monologue for callback', description: 'Additional details or feedback' })
  @IsString()
  @IsNotEmpty()
  details: string;
}
