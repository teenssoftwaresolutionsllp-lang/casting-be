import { Injectable, NotFoundException } from '@nestjs/common';
import { VideoRepository } from './video.repository';
import { CreateVideoDto } from './dto/create-video.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { QuotaService } from '../users/quota.service';

@Injectable()
export class VideoService {
  constructor(
    private readonly videoRepository: VideoRepository,
    private readonly quotaService: QuotaService,
  ) {}

  async createVideo(creatorId: string, dto: CreateVideoDto) {
    return this.videoRepository.create({
      creatorId,
      category: dto.category,
      title: dto.title,
      desc: dto.desc,
      url: dto.url,
      thumb: dto.thumb,
    });
  }

  async findAll(userId: string, category?: string) {
    const list = await this.videoRepository.findAll(category);
    
    // map "liked" boolean state for the current requesting user
    return Promise.all(
      list.map(async (v) => {
        const liked = await this.videoRepository.hasLiked(v.id, userId);
        return {
          id: v.id,
          category: v.category,
          creatorId: v.creatorId,
          creatorName: v.creatorName || 'Anonymous',
          creatorPic: v.creatorPic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          creatorCategory: v.creatorCategory || 'Actor',
          title: v.title,
          desc: v.desc,
          url: v.url,
          thumb: v.thumb,
          likesCount: v.likesCount,
          viewsCount: v.viewsCount,
          liked,
          createdAt: v.createdAt,
        };
      }),
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
      creatorPic: v.creatorPic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      creatorCategory: v.creatorCategory || 'Actor',
      title: v.title,
      desc: v.desc,
      url: v.url,
      thumb: v.thumb,
      likesCount: v.likesCount,
      viewsCount: v.viewsCount,
      liked,
      createdAt: v.createdAt,
    };
  }

  async toggleLikeVideo(videoId: string, userId: string) {
    // Validate video existence
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }

    const liked = await this.videoRepository.hasLiked(videoId, userId);
    if (liked) {
      await this.videoRepository.removeLike(videoId, userId);
      return { liked: false, likesCount: Math.max(0, video.likesCount - 1) };
    }

    const snapshot = await this.quotaService.loadFreshQuota(userId);
    const likedOk = await this.quotaService.tryConsumeLike(userId, snapshot.limits.likesPerDay);
    if (!likedOk) {
      this.quotaService.throwPaywall('Daily like limit reached. Upgrade to continue.');
    }

    await this.videoRepository.addLike(videoId, userId);
    return { liked: true, likesCount: video.likesCount + 1 };
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
    const commentsList = await this.videoRepository.getComments(videoId);
    
    return Promise.all(
      commentsList.map(async (c) => {
        const liked = await this.videoRepository.hasLikedComment(c.id, userId);
        return {
          id: c.id,
          videoId: c.videoId,
          userId: c.userId,
          text: c.text,
          likes: c.likesCount,
          time: 'Just now', // for seed simplicity
          author: c.author || 'Anonymous',
          authorPic: c.authorPic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          liked,
          createdAt: c.createdAt,
        };
      }),
    );
  }

  async postComment(videoId: string, userId: string, dto: CreateCommentDto) {
    const video = await this.videoRepository.findById(videoId);
    if (!video) {
      throw new NotFoundException(`Video with ID ${videoId} not found.`);
    }

    const snapshot = await this.quotaService.loadFreshQuota(userId);
    const maxComments = this.quotaService.commentLimitFor(snapshot);
    if (maxComments <= 0) {
      this.quotaService.throwPaywall(
        snapshot.plan === 'free'
          ? 'Like 20 videos today to unlock 2 comments, or upgrade your plan.'
          : 'Daily comment limit reached. Upgrade to continue.',
      );
    }

    const commentOk = await this.quotaService.tryConsumeComment(userId, maxComments);
    if (!commentOk) {
      this.quotaService.throwPaywall('Daily comment limit reached. Upgrade to continue.');
    }

    const created = await this.videoRepository.createComment({
      videoId,
      userId,
      text: dto.text,
    });

    return created;
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
      return { liked: true, likes: comment.likesCount + 1 };
    }
  }
}
