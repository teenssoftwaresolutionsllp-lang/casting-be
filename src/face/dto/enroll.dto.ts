import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  Validate,
} from 'class-validator';
import { FaceEmbeddingLengthValidator } from './embedding-length.validator';

export class EnrollDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(4096)
  @IsNumber({ allowNaN: false, allowInfinity: false }, { each: true })
  @Validate(FaceEmbeddingLengthValidator)
  embedding: number[];

  @IsString()
  @MaxLength(128)
  modelVersion: string;

  @IsInt()
  @Min(1)
  sampleCount: number;
}
