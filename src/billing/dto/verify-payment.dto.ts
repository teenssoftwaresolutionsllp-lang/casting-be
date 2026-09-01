import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Order id Razorpay gave us when checkout started' })
  @IsString()
  razorpayOrderId: string;

  @ApiProperty({ description: 'Payment id Razorpay gave after the user paid' })
  @IsString()
  razorpayPaymentId: string;

  @ApiProperty({ description: 'Signature from Razorpay. The server checks this with the secret key.' })
  @IsString()
  razorpaySignature: string;
}
