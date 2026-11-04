import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { VideoRepository } from './video.repository.js';
import { NotificationService } from '../notifications/notification.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { CreateCommentDto } from './dto/create-comment.dto.js';
import { S3Service } from '../storage/s3.service.js';

@Injectable()
export class VideoService {
  private readonly defaultProfilePic = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80';

  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly notificationService: NotificationService,
    private readonly s3: S3Service,
  ) {}

  async createVideo(creatorId: string, dto: CreateVideoDto) {
    const created = await this.videoRepository.create({
      creatorId,
      category: dto.category,
      title: dto.title,
      desc: dto.desc,
      url: dto.url,
      thumb: dto.thumb,
    });
    return {
      ...created,
      key: created.url,
    };
  }

  async findAll(userId: string, category?: string) {
    const list = await this.videoRepository.findAllWithUserLike(userId, category);

    return Promise.all(
      list.map(async (v) => ({
        id: v.id,
        category: v.category,
        creatorId: v.creatorId,
        creatorName: v.creatorName || 'Anonymous',
        creatorPic: (await this.s3.resolveUrl(v.creatorPic)) || this.defaultProfilePic,
        creatorCategory: v.creatorCategory || 'Actor',
        title: v.title,
        desc: v.desc,
        url: (await this.s3.resolveUrl(v.url)) ?? v.url,
        thumb: (await this.s3.resolveUrl(v.thumb)) ?? v.thumb,
        key: v.url,
        likesCount: v.likesCount,
        viewsCount: v.viewsCount,
        liked: !!v.likedUserId,
        createdAt: v.createdAt,
      })),
    );
  }

  async findOne(id: string, userId: string) {
    const v = await this.videoRepository.findById(id);
    if (!v) {
      throw new NotFoundException(`Video with ID ${id} not found.`);
    }
    const liked = await this.videoRepository.hasLiked(v.id, userId);
    return {
      id: v.id,
      category: v.category,
      creatorId: v.creatorId,
      creatorName: v.creatorName || 'Anonymous',
      creatorPic: (await this.s3.resolveUrl(v.creatorPic)) || this.defaultProfilePic,
      creatorCategory: v.creatorCategory || 'Actor',
      title: v.title,
      desc: v.desc,
      url: (await this.s3.resolveUrl(v.url)) ?? v.url,
      thumb: (await this.s3.resolveUrl(v.thumb)) ?? v.thumb,
      key: v.url,
      likesCount: v.likesCount,
      viewsCount: v.viewsCount,
      liked,
      createdAt: v.createdAt,
    };
  }

  async deleteVideo(videoId: string, userId: string) {
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }
    if (video.creatorId !== userId) {
      throw new ForbiddenException('You can only delete your own posts.');
    }

    // Delete S3 objects (skips legacy Cloudinary URLs)
    if (this.s3.isS3Key(video.url)) {
      await this.s3.delete(video.url).catch(() => undefined);
    }
    if (video.thumb !== video.url && this.s3.isS3Key(video.thumb)) {
      await this.s3.delete(video.thumb).catch(() => undefined);
    }

    const deleted = await this.videoRepository.deleteByIdAndCreator(videoId, userId);
    if (!deleted) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }
    return { deleted: true };
  }

  async toggleLikeVideo(videoId: string, userId: string) {
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }

    const liked = await this.videoRepository.hasLiked(videoId, userId);
    if (liked) {
      await this.videoRepository.removeLike(videoId, userId);
      return { liked: false, likesCount: Math.max(0, video.likesCount - 1) };
    } else {
      const created = await this.videoRepository.addLike(videoId, userId);

      if (created && video.creatorId !== userId) {
        // POST_LIKED notification + FCM push
        this.notificationService
          .createNotification(video.creatorId, 'New like', 'Someone liked your post.', {
            actorId: userId,
            type: 'POST_LIKED',
            entityType: 'VIDEO',
            entityId: videoId,
          })
          .catch(() => undefined);
      }

      return {
        liked: true,
        likesCount: video.likesCount + (created ? 1 : 0),
      };
    }
  }

  async incrementViews(videoId: string) {
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }
    await this.videoRepository.incrementViews(videoId);
    return { success: true, viewsCount: video.viewsCount + 1 };
  }

  // Comments business logic
  async getComments(videoId: string, userId: string) {
    const commentsList = await this.videoRepository.getCommentsWithUserLike(videoId, userId);

    return Promise.all(
      commentsList.map(async (c) => ({
        id: c.id,
        videoId: c.videoId,
        userId: c.userId,
        text: c.text,
        likes: c.likesCount,
        time: 'Just now',
        author: c.author || 'Anonymous',
        authorPic: (await this.s3.resolveUrl(c.authorPic)) || this.defaultProfilePic,
        liked: !!c.likedUserId,
        createdAt: c.createdAt,
      })),
    );
  }

  async postComment(videoId: string, userId: string, dto: CreateCommentDto) {
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }

    const comment = await this.videoRepository.createComment({ videoId, userId, text: dto.text });

    if (video.creatorId !== userId) {
      // POST_COMMENTED notification + FCM push
      this.notificationService
        .createNotification(video.creatorId, 'New comment', 'Someone commented on your post.', {
          actorId: userId,
          type: 'POST_COMMENTED',
          entityType: 'VIDEO',
          entityId: videoId,
        })
        .catch(() => undefined);
    }

    return comment;
  }

  async toggleLikeComment(commentId: string, userId: string) {
    const comment = await this.videoRepository.getCommentById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    const liked = await this.videoRepository.hasLikedComment(commentId, userId);
    if (liked) {
      await this.videoRepository.removeCommentLike(commentId, userId);
      return { liked: false, likes: Math.max(0, comment.likesCount - 1) };
    } else {
      await this.videoRepository.addCommentLike(commentId, userId);

      if (comment.userId !== userId) {
        // COMMENT_LIKED notification + FCM push
        this.notificationService
          .createNotification(comment.userId, 'New like on comment', 'Someone liked your comment.', {
            actorId: userId,
            type: 'COMMENT_LIKED',
            entityType: 'VIDEO',
            entityId: comment.videoId,
          })
          .catch(() => undefined);
      }

      return { liked: true, likes: comment.likesCount + 1 };
    }
  }
}
