import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

export interface EncryptedFaceTemplate {
  templateEncrypted: string;
  iv: string;
  authTag: string;
  keyVersion: number;
}

@Injectable()
export class FaceCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(embedding: number[]): EncryptedFaceTemplate {
    const keyVersion = this.getActiveKeyVersion();
    const key = this.getKey(keyVersion);
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(embedding), 'utf8'),
      cipher.final(),
    ]);

    return {
      templateEncrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: cipher.getAuthTag().toString('base64'),
      keyVersion,
    };
  }

  decrypt(template: {
    templateEncrypted: string;
    iv: string;
    authTag: string;
    keyVersion: number;
  }): number[] {
    const decipher = createDecipheriv(
      'aes-256-gcm',
      this.getKey(template.keyVersion),
      Buffer.from(template.iv, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(template.authTag, 'base64'));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(template.templateEncrypted, 'base64')),
      decipher.final(),
    ]).toString('utf8');
    const embedding: unknown = JSON.parse(plaintext);

    if (!Array.isArray(embedding) || !embedding.every(Number.isFinite)) {
      throw new Error('Stored face template is invalid.');
    }
    return embedding as number[];
  }

  private getActiveKeyVersion(): number {
    const versionValue = this.configService.get<string>(
      'FACE_ENCRYPTION_KEY_VERSION',
    );
    const version = Number(versionValue);
    if (!versionValue || !Number.isSafeInteger(version) || version < 1) {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }
    return version;
  }

  private getKey(version: number): Buffer {
    const configuredKeys = this.configService.get<string>(
      'FACE_ENCRYPTION_KEYS',
    );
    if (!configuredKeys) {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }

    let keys: Record<string, string>;
    try {
      const parsed: unknown = JSON.parse(configuredKeys);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid key map.');
      }
      keys = parsed as Record<string, string>;
    } catch {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }

    const encodedKey = keys[String(version)];
    if (typeof encodedKey !== 'string') {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }
    const key = Buffer.from(encodedKey, 'base64');
    if (key.length !== 32 || key.toString('base64') !== encodedKey) {
      throw new ServiceUnavailableException({
        code: 'FACE_CONFIGURATION_UNAVAILABLE',
      });
    }
    return key;
  }
}
