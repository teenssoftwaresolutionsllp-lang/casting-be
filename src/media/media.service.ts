import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import * as stream from 'stream';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private isCloudinaryConfigured = false;

  constructor(private configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.isCloudinaryConfigured = !!(cloudName && apiKey && apiSecret);

    if (this.isCloudinaryConfigured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
      this.logger.log('Cloudinary configured successfully.');
    } else {
      this.logger.warn('Cloudinary credentials missing. Uploads will return mock URLs.');
    }
  }

  async uploadFile(file: Express.Multer.File, folder = 'talent_casting'): Promise<string> {
    if (!this.isCloudinaryConfigured) {
      this.logger.warn('Cloudinary not configured. Returning mock URL.');
      if (file.mimetype.startsWith('video/')) {
        return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      }
      if (file.mimetype === 'application/pdf') {
        return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      }
      return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80';
    }

    // Determine resource type for Cloudinary
    let resourceType: 'image' | 'video' | 'raw' | 'auto' = 'auto';
    if (file.mimetype.startsWith('image/')) resourceType = 'image';
    else if (file.mimetype.startsWith('video/')) resourceType = 'video';
    else resourceType = 'raw';

    try {
      const result = await this.uploadToCloudinary(file.buffer, folder, resourceType);
      this.logger.log(`Upload successful: ${result}`);
      return result;
    } catch (error) {
      this.logger.error('Cloudinary upload failed:', error);
      // Fallback to mock URL so the app doesn't break
      return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80';
    }
  }

  private uploadToCloudinary(
    fileBuffer: Buffer,
    folder: string,
    resourceType: 'image' | 'video' | 'raw' | 'auto',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
        },
        (error: any, result: UploadApiResponse | undefined) => {
          if (error) {
            return reject(error);
          }
          if (!result || !result.secure_url) {
            return reject(new Error('Cloudinary returned no URL'));
          }
          resolve(result.secure_url);
        },
      );

      // Convert buffer to readable stream and pipe into Cloudinary
      const bufferStream = new stream.PassThrough();
      bufferStream.end(fileBuffer);
      bufferStream.pipe(uploadStream);
    });
  }
}
