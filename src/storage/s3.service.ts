import { Injectable, Logger, OnModuleInit, BadRequestException } from '@nestjs/common';
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
import type { StorageEngine } from 'multer';

export interface UploadResult {
  key: string;
  url: string;
}

@Injectable()
export class S3Service implements OnModuleInit {
  private static instance: S3Service;
  private readonly logger = new Logger(S3Service.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly keyPrefix: string;
  private readonly signedUrlTtl: number;
  private readonly cloudfrontDomain: string | undefined;

  public static getInstance(): S3Service {
    return S3Service.instance;
  }

  constructor(private readonly config: ConfigService) {
    const region = this.config.get<string>('AWS_REGION', 'ap-southeast-2');
    this.bucket = this.config.get<string>('S3_BUCKET', 'casting-app-s3');
    const rawPrefix = (this.config.get<string>('S3_KEY_PREFIX') || '').trim();
    this.keyPrefix = rawPrefix && !rawPrefix.endsWith('/') ? `${rawPrefix}/` : rawPrefix;
    this.signedUrlTtl = Number(
      this.config.get<string>('S3_SIGNED_URL_TTL', '3600'),
    );
    this.cloudfrontDomain = this.config.get<string>('CLOUDFRONT_DOMAIN');

    // Uses the default credential chain (instance role on EC2, env vars locally)
    this.client = new S3Client({ region });
    S3Service.instance = this;
  }

  onModuleInit() {
    S3Service.instance = this;
    this.logger.log(
      `S3Service ready – bucket=${this.bucket}, prefix="${this.keyPrefix}", ` +
        `ttl=${this.signedUrlTtl}s, cloudfront=${this.cloudfrontDomain ?? 'off'}`,
    );
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Upload (streams via @aws-sdk/lib-storage – no full-buffer in memory)
  // ──────────────────────────────────────────────────────────────────────────

  async upload(
    fileOrStream: Express.Multer.File | Readable | Buffer,
    folder: string,
    mimeType?: string,
    originalName?: string,
  ): Promise<UploadResult> {
    let body: Readable;
    let contentType = mimeType || 'application/octet-stream';
    let filename = originalName || '';

    if (Buffer.isBuffer(fileOrStream)) {
      body = Readable.from(fileOrStream);
    } else if (fileOrStream && typeof (fileOrStream as any).pipe === 'function') {
      body = fileOrStream as Readable;
    } else if (fileOrStream && typeof fileOrStream === 'object') {
      const mFile = fileOrStream as Express.Multer.File;
      if (mFile.buffer && Buffer.isBuffer(mFile.buffer)) {
        body = Readable.from(mFile.buffer);
      } else if (mFile.stream && typeof (mFile.stream as any).pipe === 'function') {
        body = mFile.stream;
      } else if ((mFile as any).path) {
        const fs = await import('fs');
        body = fs.createReadStream((mFile as any).path);
      } else {
        throw new BadRequestException('Invalid file upload payload');
      }
      contentType = mimeType || mFile.mimetype || contentType;
      filename = originalName || mFile.originalname || filename;
    } else {
      throw new BadRequestException('No file provided for upload');
    }

    const ext = extname(filename) || this.extFromMime(contentType);
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

/**
 * Custom Multer StorageEngine that streams incoming files directly to S3 via S3Service.
 * This ensures large video files (up to 500 MiB) are streamed in 5 MiB chunks without
 * buffering into RAM on a 1 GiB memory machine.
 */
export class S3StorageEngine implements StorageEngine {
  constructor(private readonly folder: string) {}

  _handleFile(
    _req: any,
    file: Express.Multer.File,
    cb: (error?: any, info?: Partial<Express.Multer.File>) => void,
  ): void {
    const s3 = S3Service.getInstance();
    if (!s3) {
      return cb(new Error('S3Service has not been initialized yet'));
    }

    s3.upload(file.stream, this.folder, file.mimetype, file.originalname)
      .then((result) => {
        (file as any).key = result.key;
        (file as any).url = result.url;
        cb(null, {
          path: result.url,
          size: (file as any).size,
        });
      })
      .catch((err) => cb(err));
  }

  _removeFile(
    _req: any,
    file: Express.Multer.File,
    cb: (error: Error | null) => void,
  ): void {
    const key = (file as any)?.key;
    const s3 = S3Service.getInstance();
    if (s3 && key && s3.isS3Key(key)) {
      s3.delete(key).then(() => cb(null)).catch(cb);
    } else {
      cb(null);
    }
  }
}

export function createS3Storage(folder = 'general'): StorageEngine {
  return new S3StorageEngine(folder);
}
