import { ConfigService } from '@nestjs/config';
import { S3Service, createS3Storage } from './s3.service';
import { Readable } from 'stream';

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: jest.fn().mockResolvedValue({}),
    })),
    DeleteObjectCommand: jest.fn().mockImplementation((args) => args),
    GetObjectCommand: jest.fn().mockImplementation((args) => args),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest
    .fn()
    .mockImplementation(async (_client, cmd, opts) => `https://s3.signed.url/${cmd.Key}?ttl=${opts.expiresIn}`),
}));

jest.mock('@aws-sdk/lib-storage', () => {
  return {
    Upload: jest.fn().mockImplementation(({ params }) => ({
      done: jest.fn().mockResolvedValue({
        Key: params.Key,
        Bucket: params.Bucket,
      }),
    })),
  };
});

describe('S3Service', () => {
  let service: S3Service;
  let configService: ConfigService;

  beforeEach(() => {
    configService = new ConfigService({
      AWS_REGION: 'ap-southeast-2',
      S3_BUCKET: 'casting-app-s3',
      S3_KEY_PREFIX: 'casting/',
      S3_SIGNED_URL_TTL: '1800',
    });
    service = new S3Service(configService);
  });

  describe('isS3Key', () => {
    it('returns false for null or undefined', () => {
      expect(service.isS3Key(null)).toBe(false);
      expect(service.isS3Key(undefined)).toBe(false);
      expect(service.isS3Key('')).toBe(false);
    });

    it('returns false for legacy Cloudinary HTTP(S) URLs', () => {
      expect(service.isS3Key('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(false);
      expect(service.isS3Key('http://res.cloudinary.com/demo/video/upload/sample.mp4')).toBe(false);
    });

    it('returns true for S3 object keys', () => {
      expect(service.isS3Key('casting/videos/abc-123.mp4')).toBe(true);
      expect(service.isS3Key('general/def-456.jpg')).toBe(true);
    });
  });

  describe('resolveUrl', () => {
    it('leaves legacy Cloudinary URLs untouched', async () => {
      const legacyUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const resolved = await service.resolveUrl(legacyUrl);
      expect(resolved).toBe(legacyUrl);
    });

    it('returns null for empty values', async () => {
      expect(await service.resolveUrl(null)).toBeNull();
      expect(await service.resolveUrl(undefined)).toBeNull();
    });

    it('generates presigned URLs for S3 keys with configured TTL', async () => {
      const s3Key = 'casting/photos/test-image.jpg';
      const resolved = await service.resolveUrl(s3Key);
      expect(resolved).toContain('https://s3.signed.url/casting/photos/test-image.jpg');
      expect(resolved).toContain('ttl=1800');
    });

    it('uses CloudFront domain when CLOUDFRONT_DOMAIN is set', async () => {
      const cfConfig = new ConfigService({
        AWS_REGION: 'ap-southeast-2',
        S3_BUCKET: 'casting-app-s3',
        CLOUDFRONT_DOMAIN: 'cdn.casting.example.com',
      });
      const cfService = new S3Service(cfConfig);
      const resolved = await cfService.resolveUrl('videos/test.mp4');
      expect(resolved).toBe('https://cdn.casting.example.com/videos/test.mp4');
    });

    it('replaces expired S3 presigned URLs with the configured CloudFront URL', async () => {
      const cfConfig = new ConfigService({
        AWS_REGION: 'ap-southeast-2',
        S3_BUCKET: 'casting-app-s3',
        CLOUDFRONT_DOMAIN: 'cdn.casting.example.com',
      });
      const cfService = new S3Service(cfConfig);

      await expect(
        cfService.resolveUrl(
          'https://casting-app-s3.s3.ap-southeast-2.amazonaws.com/casting/photos/avatar.jpg?X-Amz-Expires=3600&X-Amz-Signature=expired',
        ),
      ).resolves.toBe(
        'https://cdn.casting.example.com/casting/photos/avatar.jpg',
      );
    });

    it('does not rewrite URLs hosted outside the configured S3 bucket', async () => {
      const externalUrl = 'https://images.example.com/avatar.jpg';

      await expect(service.resolveUrl(externalUrl)).resolves.toBe(externalUrl);
    });
  });

  describe('upload', () => {
    it('uploads a stream to S3 under the configured prefix', async () => {
      const stream = Readable.from(Buffer.from('dummy video chunk data'));
      const result = await service.upload(stream, 'videos', 'video/mp4', 'audition.mp4');

      expect(result.key).toMatch(/^casting\/videos\/[a-f0-9-]+\.mp4$/);
      expect(result.url).toContain(result.key);
    });

    it('uploads a Multer file with buffer and infers extension from mime', async () => {
      const file = {
        buffer: Buffer.from('image content'),
        mimetype: 'image/jpeg',
        originalname: 'headshot.jpeg',
      } as Express.Multer.File;

      const result = await service.upload(file, 'photos');
      expect(result.key).toMatch(/^casting\/photos\/[a-f0-9-]+\.jpeg$/);
    });
  });

  describe('delete', () => {
    it('sends DeleteObjectCommand with bucket and key', async () => {
      await expect(service.delete('casting/photos/sample.jpg')).resolves.not.toThrow();
    });
  });

  describe('S3StorageEngine', () => {
    it('streams files directly to S3 without buffering', (done) => {
      const storage = createS3Storage('videos');
      const fakeStream = Readable.from(Buffer.from('chunk1 chunk2'));
      const fakeFile = {
        stream: fakeStream,
        mimetype: 'video/mp4',
        originalname: 'large-video.mp4',
      } as any;

      storage._handleFile({} as any, fakeFile, (err, info) => {
        expect(err).toBeNull();
        expect(fakeFile.key).toBeDefined();
        expect(fakeFile.key).toMatch(/^casting\/videos\//);
        expect(fakeFile.url).toBeDefined();
        expect(info?.path).toBe(fakeFile.url);
        done();
      });
    });
  });
});
