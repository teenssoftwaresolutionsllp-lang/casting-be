import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class VerifyPaymentDto {
  @ApiProperty({ description: 'Order id Razorpay gave us when checkout started', example: 'order_xxx' })
  @IsString()
  razorpayOrderId: string;

  @ApiPropertyOptional({ description: 'Payment id Razorpay gave after user paid. Optional in test mode.', example: 'pay_test_123' })
  @IsOptional()
  @IsString()
  razorpayPaymentId?: string;

  @ApiPropertyOptional({ description: 'Signature from Razorpay. Optional in test mode.', example: 'test_signature' })
  @IsOptional()
  @IsString()
  razorpaySignature?: string;
}
