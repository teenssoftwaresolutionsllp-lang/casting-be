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
import { VideoService } from '../videos/video.service';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

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
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
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
    private readonly videoService: VideoService,
  ) {}

  @Post()
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
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const url = await this.mediaService.uploadFile(file, 'photos');
    
    // Save photo as a media item with category 'Photos' so it shows in feeds/portfolio
    const photoPost = await this.videoService.createVideo(user.sub, {
      category: 'Photos',
      title: body?.title || 'Untitled Photo',
      desc: body?.description || 'No description',
      url,
      thumb: url, // For photos, the photo URL itself is the thumbnail!
    });

    // Return the full populated post details matching what the feed expects
    return this.videoService.findOne(photoPost.id, user.sub);
  }

  @Get()
  @ApiOperation({ summary: 'Get all photos' })
  async getPhotos(@CurrentUser() user: any) {
    // Photos are stored in the videos table with category = 'Photos'
    return this.videoService.findAll(user.sub, 'Photos');
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
    private readonly videoService: VideoService,
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
    @UploadedFile() file: Express.Multer.File,
    @Body() body: Record<string, any>,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
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
