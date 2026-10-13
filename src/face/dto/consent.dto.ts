import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class ConsentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  version: string;
}
