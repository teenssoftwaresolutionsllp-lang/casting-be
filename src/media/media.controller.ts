import {
  Controller,
  Post,
  Get,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  UseGuards,
  Delete,
  Param,
  ParseUUIDPipe,
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
import { MediaService } from './media.service.js';
import { VideoService } from '../videos/video.service.js';
import { createS3Storage } from '../storage/s3.service.js';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';

const MAX_IMAGE_MB = Number(process.env.MAX_IMAGE_MB || 50);
const MAX_VIDEO_MB = Number(process.env.MAX_VIDEO_MB || 500);

@ApiTags('Media')
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  // ── Existing generic upload (no auth required) ───────────────────────────
  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createS3Storage('general'),
      limits: { fileSize: Math.max(MAX_IMAGE_MB, MAX_VIDEO_MB, 100) * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image, video or PDF resume to S3' })
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
    description: 'Returns the upload URL and S3 key.',
  })
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    const { key, url } = await this.mediaService.uploadFile(file, 'general');
    return { url, key };
  }
}

// ─── /photos controller ──────────────────────────────────────────────────────
@ApiTags('Photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('photos')
export class PhotosController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly videoService: VideoService,
  ) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createS3Storage('photos'),
      limits: { fileSize: MAX_IMAGE_MB * 1024 * 1024 },
    }),
  )
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
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const { key, url } = await this.mediaService.uploadFile(file, 'photos');
    
    // Save photo as a media item with category 'Photos' so it shows in feeds/portfolio
    const photoPost = await this.videoService.createVideo(user.sub, {
      category: 'Photos',
      title: body?.title || 'Untitled Photo',
      desc: body?.description || 'No description',
      url: key,          // Store the S3 key in the database
      thumb: key,        // For photos, the photo key itself is the thumbnail
    });

    // Return the full populated post details matching what the feed expects + key field
    const populated = await this.videoService.findOne(photoPost.id, user.sub);
    return { ...populated, key };
  }

  @Get()
  @ApiOperation({ summary: 'Get all photos' })
  async getPhotos(@CurrentUser() user: any) {
    // Photos are stored in the videos table with category = 'Photos'
    return this.videoService.findAll(user.sub, 'Photos', undefined, false);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your own photo post' })
  @ApiResponse({ status: 200, description: 'Photo post deleted.' })
  async deletePhoto(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) id: string) {
    return this.videoService.deleteVideo(id, user.sub);
  }
}

// ─── /videos/upload controller ───────────────────────────────────────────────
@ApiTags('Videos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideoUploadController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly videoService: VideoService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: createS3Storage('videos'),
      limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a video file and get its S3 URL' })
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
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const { key, url } = await this.mediaService.uploadFile(file, 'videos');
    
    // Save to videos database table – store the S3 key, not the URL
    const videoPost = await this.videoService.createVideo(user.sub, {
      category: body?.category || 'Films',
      title: body?.title || 'Untitled Video',
      desc: body?.description || 'No description',
      url: key,
      thumb: key, // Will be resolved when returned to client
    });

    // Return the full populated post details matching what the feed expects + key field
    const populated = await this.videoService.findOne(videoPost.id, user.sub);
    return { ...populated, key };
  }
}
