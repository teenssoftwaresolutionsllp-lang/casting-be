import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  purpose: string;
}
