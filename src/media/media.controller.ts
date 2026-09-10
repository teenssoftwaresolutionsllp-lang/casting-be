import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiConsumes,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { MediaService } from './media.service';
import { PhotoService } from '../photos/photo.service';
import { VideoService as VideoPostService } from '../videos/video.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { QuotaService } from '../users/quota.service';

type UploadedFile = {
  mimetype: string;
  buffer: Buffer;
};

@ApiTags('04 Media Upload')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ── Existing generic upload (no auth required) ───────────────────────────
  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image, video or PDF resume to Cloudinary' })
  @ApiBody({
    description: 'File to upload',
    required: true,
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Returns the secure upload URL from Cloudinary.',
  })
  async uploadFile(@UploadedFile() file: UploadedFile) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const url = await this.mediaService.uploadFile(file);
    return { url };
  }
}

// ─── /photos controller ──────────────────────────────────────────────────────
@ApiTags('06 Photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('photos')
export class PhotosController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly photoService: PhotoService,
    private readonly quotaService: QuotaService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 50 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a photo to portfolio' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
      },
    },
  })
  async uploadPhoto(
    @CurrentUser() user: any,
    @UploadedFile() file: UploadedFile,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.quotaService.ensureCanCreatePhoto(user.sub);
    const url = await this.mediaService.uploadFile(file, 'photos');

    const photoPost = await this.photoService.createPhoto(user.sub, {
      category: body?.category || 'Portrait',
      title: body?.title || 'Untitled Photo',
      desc: body?.description || 'No description',
      url,
      thumb: url,
    });

    return this.photoService.findOne(photoPost.id, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all photos' })
  async getPhotos(@CurrentUser() user: any) {
    return this.photoService.findAll(user.sub);
  }
}

// ─── /videos/upload controller ───────────────────────────────────────────────
@ApiTags('05 Videos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideoUploadController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly videoService: VideoPostService,
    private readonly quotaService: QuotaService,
  ) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 500 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video file and get its Cloudinary URL' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        description: { type: 'string' },
        category: { type: 'string' },
      },
    },
  })
  async uploadVideo(
    @CurrentUser() user: any,
    @UploadedFile() file: UploadedFile,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    await this.quotaService.ensureCanCreateVideo(user.sub);
    const url = await this.mediaService.uploadFile(file, 'videos');
    
    // Save to videos database table
    const videoPost = await this.videoService.createVideo(user.sub, {
      category: body?.category || 'Films',
      title: body?.title || 'Untitled Video',
      desc: body?.description || 'No description',
      url,
      thumb: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=600&q=80',
    });

    // Return the full populated post details matching what the feed expects
    return this.videoService.findOne(videoPost.id, user.sub);
  }
}
