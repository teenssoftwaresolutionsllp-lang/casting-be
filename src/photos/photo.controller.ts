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
import { PhotoService } from './photo.service';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { CreatePhotoCommentDto } from './dto/create-photo-comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Photos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('photos')
export class PhotoController {
  constructor(private readonly photoService: PhotoService) {}

  @Post()
  @ApiOperation({ summary: 'Post a new photo' })
  @ApiResponse({ status: 201, description: 'Photo posted successfully.' })
  async create(@CurrentUser() user: any, @Body() dto: CreatePhotoDto) {
    return this.photoService.createPhoto(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve photo feeds' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter photos by category' })
  @ApiResponse({ status: 200, description: 'Returns photo list annotated with liked state.' })
  async findAll(@CurrentUser() user: any, @Query('category') category?: string) {
    return this.photoService.findAll(user.sub, category);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve detailed statistics for a single photo' })
  @ApiResponse({ status: 200, description: 'Photo details retrieved.' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.photoService.findOne(id, user.sub);
  }

  @Post(':id/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a photo' })
  @ApiResponse({ status: 200, description: 'Returns photo liked state.' })
  async toggleLike(@CurrentUser() user: any, @Param('id') id: string) {
    return this.photoService.toggleLikePhoto(id, user.sub);
  }

  @Post(':id/view')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Increment photo view counter' })
  @ApiResponse({ status: 200, description: 'Views incremented.' })
  async incrementView(@Param('id') id: string) {
    return this.photoService.incrementViews(id);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments thread list for a photo' })
  @ApiResponse({ status: 200, description: 'Returns list of comments.' })
  async getComments(@CurrentUser() user: any, @Param('id') id: string) {
    return this.photoService.getComments(id, user.sub);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Post a comment on a photo' })
  @ApiResponse({ status: 201, description: 'Comment created.' })
  async postComment(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: CreatePhotoCommentDto,
  ) {
    return this.photoService.postComment(id, user.sub, dto);
  }

  @Post('comments/:commentId/like')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Like or unlike a photo comment' })
  @ApiResponse({ status: 200, description: 'Toggled photo comment like state.' })
  async toggleLikeComment(@CurrentUser() user: any, @Param('commentId') commentId: string) {
    return this.photoService.toggleLikeComment(commentId, user.sub);
  }
}
