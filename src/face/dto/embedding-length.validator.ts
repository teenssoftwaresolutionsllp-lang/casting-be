import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'faceEmbeddingLength', async: false })
@Injectable()
export class FaceEmbeddingLengthValidator implements ValidatorConstraintInterface {
  constructor(private readonly configService: ConfigService) {}

  validate(value: unknown): boolean {
    const configuredLength = Number(
      this.configService.get<string>('FACE_EMBEDDING_LENGTH'),
    );
    if (!Number.isSafeInteger(configuredLength) || configuredLength <= 0) {
      return true;
    }
    return Array.isArray(value) && value.length === configuredLength;
  }

  defaultMessage(): string {
    return 'embedding must match the configured face embedding length.';
  }
}
