import { MediaService } from './media.service';
import { S3Service } from '../storage/s3.service';

describe('MediaService', () => {
  let mediaService: MediaService;
  let s3Service: {
    upload: jest.Mock;
    delete: jest.Mock;
    resolveUrl: jest.Mock;
    isS3Key: jest.Mock;
  };

  beforeEach(() => {
    s3Service = {
      upload: jest.fn().mockResolvedValue({
        key: 'general/uuid.png',
        url: 'https://s3.example.com/general/uuid.png',
      }),
      delete: jest.fn().mockResolvedValue(undefined),
      resolveUrl: jest.fn().mockImplementation(async (v) => v),
      isS3Key: jest.fn().mockImplementation((v) => Boolean(v && !v.startsWith('http'))),
    };
    mediaService = new MediaService(s3Service as unknown as S3Service);
  });

  describe('uploadFile', () => {
    it('returns existing key and url if file was already uploaded via streaming storage engine', async () => {
      const file = {
        key: 'videos/streamed-key.mp4',
        url: 'https://s3.example.com/videos/streamed-key.mp4',
      } as any;

      const result = await mediaService.uploadFile(file, 'videos');
      expect(result).toEqual({
        key: 'videos/streamed-key.mp4',
        url: 'https://s3.example.com/videos/streamed-key.mp4',
      });
      expect(s3Service.upload).not.toHaveBeenCalled();
    });

    it('delegates to s3Service.upload when file has not yet been streamed', async () => {
      const file = {
        buffer: Buffer.from('data'),
        mimetype: 'image/png',
        originalname: 'test.png',
      } as Express.Multer.File;

      const result = await mediaService.uploadFile(file, 'general');
      expect(s3Service.upload).toHaveBeenCalledWith(file, 'general');
      expect(result.key).toBe('general/uuid.png');
    });
  });

  describe('deleteFile', () => {
    it('silently skips legacy Cloudinary URLs', async () => {
      await mediaService.deleteFile('https://res.cloudinary.com/demo/image/upload/sample.jpg');
      expect(s3Service.delete).not.toHaveBeenCalled();
    });

    it('silently skips null or undefined', async () => {
      await mediaService.deleteFile(null);
      await mediaService.deleteFile(undefined);
      expect(s3Service.delete).not.toHaveBeenCalled();
    });

    it('deletes S3 keys from S3 bucket', async () => {
      await mediaService.deleteFile('general/uuid.png');
      expect(s3Service.delete).toHaveBeenCalledWith('general/uuid.png');
    });
  });

  describe('resolveUrl', () => {
    it('delegates resolution to s3Service', async () => {
      await mediaService.resolveUrl('test-key');
      expect(s3Service.resolveUrl).toHaveBeenCalledWith('test-key');
    });
  });
});
