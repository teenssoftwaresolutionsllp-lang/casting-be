import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Readable } from 'stream';
import { randomUUID } from 'crypto';
import { extname } from 'path';

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;
  private readonly signedUrlTtl: number;
  private readonly cloudfrontDomain: string | undefined;

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION', 'ap-southeast-2');
    this.bucket = this.config.get<string>('S3_BUCKET', 'casting-app-s3');
    this.keyPrefix = this.config.get<string>('S3_KEY_PREFIX', '');
    this.signedUrlTtl = Number(
      this.config.get<string>('S3_SIGNED_URL_TTL', '3600'),
    );
    this.cloudfrontDomain = this.config.get<string>('CLOUDFRONT_DOMAIN');

    // Uses the default credential chain (instance role on EC2, env vars locally)
    this.client = new S3Client({ region });
  }

  onModuleInit() {
    this.logger.log(
      `S3Service ready – bucket=${this.bucket}, prefix="${this.keyPrefix}", ` +
        `ttl=${this.signedUrlTtl}s, cloudfront=${this.cloudfrontDomain ?? 'off'}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Upload (streams via @aws-sdk/lib-storage – no full-buffer in memory)
  // ──────────────────────────────────────────────────────────────────────────

  async upload(
    fileOrStream: Express.Multer.File | Readable,
    folder: string,
    mimeType?: string,
    originalName?: string,
  ): Promise<UploadResult> {
    const isMulterFile = !('pipe' in fileOrStream && typeof (fileOrStream as any).pipe === 'function' && !('buffer' in fileOrStream));
    const multerFile = isMulterFile ? (fileOrStream as Express.Multer.File) : undefined;

    const body: Readable | Buffer = multerFile
      ? (multerFile.buffer
          ? Readable.from(multerFile.buffer)
          : (multerFile as any).stream ?? Readable.from(multerFile.buffer))
      : (fileOrStream as Readable);

    const contentType =
      mimeType ?? multerFile?.mimetype ?? 'application/octet-stream';
    const ext =
      extname(originalName ?? multerFile?.originalname ?? '') || this.extFromMime(contentType);
    const key = `${this.keyPrefix}${folder}/${randomUUID()}${ext}`;

    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      },
      // 5 MiB parts, max 4 concurrent uploads
      queueSize: 4,
      partSize: 5 * 1024 * 1024,
      leavePartsOnError: false,
    });

    await upload.done();
    this.logger.log(`Uploaded s3://${this.bucket}/${key}`);

    const url = await this.getUrl(key);
    return { key, url };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Get URL (CloudFront or presigned)
  // ──────────────────────────────────────────────────────────────────────────

  async getUrl(key: string): Promise<string> {
    if (this.cloudfrontDomain) {
      const domain = this.cloudfrontDomain.replace(/\/+$/, '');
      return `https://${domain}/${key}`;
    }
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: this.signedUrlTtl },
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Delete
  // ──────────────────────────────────────────────────────────────────────────

  async delete(key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    this.logger.log(`Deleted s3://${this.bucket}/${key}`);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helpers
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Resolve a media value that may be a legacy Cloudinary URL (starts with
   * "http") or an S3 key. Returns a usable URL in both cases.
   */
  async resolveUrl(value: string | null | undefined): Promise<string | null> {
    if (!value) return null;
    // Legacy Cloudinary URLs are already fully-qualified
    if (value.startsWith('http://') || value.startsWith('https://')) {
      return value;
    }
    // It's an S3 key – build a URL
    return this.getUrl(value);
  }

  /** Returns true if the value looks like an S3 key (not a URL). */
  isS3Key(value: string | null | undefined): boolean {
    if (!value) return false;
    return !value.startsWith('http://') && !value.startsWith('https://');
  }

  private extFromMime(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
      'image/gif': '.gif',
      'video/mp4': '.mp4',
      'video/quicktime': '.mov',
      'video/webm': '.webm',
      'application/pdf': '.pdf',
    };
    return map[mime] ?? '';
  }
}
