import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { VideoService } from './video.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Videos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideoController {
  constructor(private readonly videoService: VideoService) {}

  @Post()
  @ApiOperation({ summary: 'Post a new video reel / audition video' })
  @ApiResponse({ status: 201, description: 'Video posted successfully.' })
  async create(@CurrentUser() user: any, @Body() dto: CreateVideoDto) {
    return this.videoService.createVideo(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve video feeds' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter videos by category' })
  @ApiResponse({ status: 200, description: 'Returns video list annotated with liked state.' })
  async findAll(@CurrentUser() user: any, @Query('category') category?: string) {
    return this.videoService.findAll(user.sub, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve detailed statistics for a single video' })
  @ApiResponse({ status: 200, description: 'Video details retrieved.' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.videoService.findOne(id, user.sub);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a video' })
  @ApiResponse({ status: 200, description: 'Returns video liked state.' })
  async toggleLike(@CurrentUser() user: any, @Param('id') id: string) {
    return this.videoService.toggleLikeVideo(id, user.sub);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment video view counter' })
  @ApiResponse({ status: 200, description: 'Views incremented.' })
  async incrementView(@Param('id') id: string) {
    return this.videoService.incrementViews(id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments thread list for a video' })
  @ApiResponse({ status: 200, description: 'Returns list of comments.' })
  async getComments(@CurrentUser() user: any, @Param('id') id: string) {
    return this.videoService.getComments(id, user.sub);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Post a comment on a video' })
  @ApiResponse({ status: 201, description: 'Comment created.' })
  async postComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.videoService.postComment(id, user.sub, dto);
  }

  @Post('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a comment' })
  @ApiResponse({ status: 200, description: 'Toggled comment like state.' })
  async toggleLikeComment(@CurrentUser() user: any, @Param('commentId') commentId: string) {
    return this.videoService.toggleLikeComment(commentId, user.sub);
  }
}
