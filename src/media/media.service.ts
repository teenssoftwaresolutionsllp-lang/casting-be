import { Injectable, Logger } from '@nestjs/common';
import { S3Service, UploadResult } from '../storage/s3.service.js';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private readonly s3: S3Service) {}

  /**
   * Upload a file to S3 and return { key, url }.
   * If the file was streamed via S3StorageEngine, its { key, url } are already
   * present and returned immediately without duplicating work or buffering.
   */
  async uploadFile(
    file: Express.Multer.File,
    folder = 'general',
  ): Promise<UploadResult> {
    if ((file as any)?.key && (file as any)?.url) {
      return {
        key: (file as any).key,
        url: (file as any).url,
      };
    }

    try {
      const result = await this.s3.upload(file, folder);
      this.logger.log(`Upload successful: ${result.key}`);
      return result;
    } catch (error) {
      this.logger.error('S3 upload failed:', error);
      throw error;
    }
  }

  /**
   * Delete an S3 object by key. Silently skips legacy Cloudinary URLs
   * (values starting with http).
   */
  async deleteFile(keyOrUrl: string | null | undefined): Promise<void> {
    if (!keyOrUrl || !this.s3.isS3Key(keyOrUrl)) {
      return; // legacy Cloudinary URL or empty – nothing to delete from S3
    }
    await this.s3.delete(keyOrUrl);
  }

  /**
   * Resolve a stored value (S3 key or legacy Cloudinary URL) to a usable URL.
   * - Cloudinary URLs (starting with http) are returned as-is.
   * - S3 keys are resolved to a presigned GET URL (or CloudFront URL).
   */
  async resolveUrl(value: string | null | undefined): Promise<string | null> {
    return this.s3.resolveUrl(value);
  }
}
