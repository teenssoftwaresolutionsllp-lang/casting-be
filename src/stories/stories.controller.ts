import {
  BadRequestException,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StoriesService } from './stories.service';

@ApiTags('Stories')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('stories')
export class StoriesController {
  constructor(private readonly storiesService: StoriesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 100 * 1024 * 1024 } }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image or video story that expires after 24 hours' })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, description: 'Story uploaded and created.' })
  async create(@CurrentUser() user: any, @UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('An image or video file is required.');
    }
    if (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/')) {
      throw new BadRequestException('Stories support image and video files only.');
    }
    return this.storiesService.create(user.sub, file);
  }

  @Get('feed')
  @ApiOperation({ summary: 'Get active stories grouped by account, with viewed status' })
  @ApiResponse({ status: 200, description: 'Paginated active story feed.' })
  async getFeed(
    @CurrentUser() user: any,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('offset', new DefaultValuePipe(0), ParseIntPipe) offset: number,
  ) {
    return this.storiesService.getFeed(user.sub, limit, offset);
  }

  @Post(':id/views')
  @ApiOperation({ summary: 'Mark an active story as viewed' })
  @ApiResponse({ status: 201, description: 'Story marked as viewed.' })
  async markViewed(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) storyId: string) {
    return this.storiesService.markViewed(storyId, user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete your own story' })
  @ApiResponse({ status: 200, description: 'Story deleted.' })
  async delete(@CurrentUser() user: any, @Param('id', ParseUUIDPipe) storyId: string) {
    return this.storiesService.delete(storyId, user.sub);
  }
}
