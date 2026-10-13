import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Validate,
} from 'class-validator';
import { FaceEmbeddingLengthValidator } from './embedding-length.validator';

export class VerifyDto {
  @IsUUID()
  challengeId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4096)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  @Validate(FaceEmbeddingLengthValidator)
  embedding: number[];

  @IsBoolean()
  livenessPassed: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  deviceId?: string;
}
