import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME') || '',
      api_key: this.configService.get('CLOUDINARY_API_KEY') || '',
      api_secret: this.configService.get('CLOUDINARY_API_SECRET') || '',
    });
  }

  async uploadFile(file: Express.Multer.File, folder = 'talent_casting'): Promise<string> {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    const isCloudinaryConfigured = cloudName && apiKey && apiSecret;

    if (!isCloudinaryConfigured) {
      this.logger.warn('Cloudinary configuration is missing. Falling back to standard mock URL.');
      // Return representative mock assets based on file mimetype
      if (file.mimetype.startsWith('video/')) {
        return 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
      }
      if (file.mimetype === 'application/pdf') {
        return 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
      }
      return 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=600&q=80';
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) {
            this.logger.error('Cloudinary upload failed', error);
            return reject(error);
          }
          resolve(result?.secure_url);
        },
      );
      uploadStream.end(file.buffer);
    });
  }
}
