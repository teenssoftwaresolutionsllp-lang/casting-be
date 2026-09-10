import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ enum: ['pro', 'pro_max'], description: 'The plan the user wants to buy. Server ignores any other plan/paid flags.' })
  @IsIn(['pro', 'pro_max'])
  plan: 'pro' | 'pro_max';
}
