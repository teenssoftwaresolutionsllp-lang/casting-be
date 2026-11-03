import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class UpdateAuditionStatusDto {
  @ApiProperty({ example: 'CLOSED', enum: ['OPEN', 'CLOSED'] })
  @IsString()
  @IsNotEmpty()
  @IsIn(['OPEN', 'CLOSED'])
  status!: 'OPEN' | 'CLOSED';
}
