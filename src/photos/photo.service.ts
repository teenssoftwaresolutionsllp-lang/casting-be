import { Injectable, NotFoundException } from '@nestjs/common';
import { PhotoRepository } from './photo.repository';
import { CreatePhotoDto } from './dto/create-photo.dto';
import { CreatePhotoCommentDto } from './dto/create-photo-comment.dto';
import { QuotaService } from '../users/quota.service';

@Injectable()
export class PhotoService {
  constructor(
    private readonly photoRepository: PhotoRepository,
    private readonly quotaService: QuotaService,
  ) {}

  async createPhoto(creatorId: string, dto: CreatePhotoDto) {
    return this.photoRepository.create({
      creatorId,
      category: dto.category,
      title: dto.title,
      desc: dto.desc,
      url: dto.url,
      thumb: dto.thumb,
    });
  }

  async findAll(userId: string, category?: string) {
    const list = await this.photoRepository.findAll(category);

    return Promise.all(
      list.map(async (p) => {
        const liked = await this.photoRepository.hasLiked(p.id, userId);
        return {
          id: p.id,
          category: p.category,
          creatorId: p.creatorId,
          creatorName: p.creatorName || 'Anonymous',
          creatorPic: p.creatorPic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          creatorCategory: p.creatorCategory || 'Actor',
          title: p.title,
          desc: p.desc,
          url: p.url,
          thumb: p.thumb,
          likesCount: p.likesCount,
          viewsCount: p.viewsCount,
          liked,
          createdAt: p.createdAt,
        };
      }),
    );
  }

  async findOne(id: string, userId: string) {
    const p = await this.photoRepository.findById(id);
    if (!p) {
      throw new NotFoundException(`Photo with ID ${id} not found.`);
    }
    const liked = await this.photoRepository.hasLiked(p.id, userId);
    return {
      id: p.id,
      category: p.category,
      creatorId: p.creatorId,
      creatorName: p.creatorName || 'Anonymous',
      creatorPic: p.creatorPic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      creatorCategory: p.creatorCategory || 'Actor',
      title: p.title,
      desc: p.desc,
      url: p.url,
      thumb: p.thumb,
      likesCount: p.likesCount,
      viewsCount: p.viewsCount,
      liked,
      createdAt: p.createdAt,
    };
  }

  async toggleLikePhoto(photoId: string, userId: string) {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found.`);
    }

    const liked = await this.photoRepository.hasLiked(photoId, userId);
    if (liked) {
      await this.photoRepository.removeLike(photoId, userId);
      return { liked: false, likesCount: Math.max(0, photo.likesCount - 1) };
    }

    const snapshot = await this.quotaService.loadFreshQuota(userId);
    const likedOk = await this.quotaService.tryConsumeLike(userId, snapshot.limits.likesPerDay);
    if (!likedOk) {
      this.quotaService.throwPaywall('Daily like limit reached. Upgrade to continue.', snapshot.plan);
    }

    await this.photoRepository.addLike(photoId, userId);
    return { liked: true, likesCount: photo.likesCount + 1 };
  }

  async incrementViews(photoId: string) {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found.`);
    }
    await this.photoRepository.incrementViews(photoId);
    return { success: true, viewsCount: photo.viewsCount + 1 };
  }

  async getComments(photoId: string, userId: string) {
    const commentsList = await this.photoRepository.getComments(photoId);

    return Promise.all(
      commentsList.map(async (c) => {
        const liked = await this.photoRepository.hasLikedComment(c.id, userId);
        return {
          id: c.id,
          photoId: c.photoId,
          userId: c.userId,
          text: c.text,
          likes: c.likesCount,
          time: 'Just now',
          author: c.author || 'Anonymous',
          authorPic: c.authorPic || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          liked,
          createdAt: c.createdAt,
        };
      }),
    );
  }

  async postComment(photoId: string, userId: string, dto: CreatePhotoCommentDto) {
    const photo = await this.photoRepository.findById(photoId);
    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found.`);
    }

    const snapshot = await this.quotaService.loadFreshQuota(userId);
    const maxComments = this.quotaService.commentLimitFor(snapshot);
    if (maxComments <= 0) {
      this.quotaService.throwPaywall(
        snapshot.plan === 'free'
          ? 'Like 20 photos today to unlock 2 comments, or upgrade your plan.'
          : 'Daily comment limit reached. Upgrade to continue.',
        snapshot.plan,
      );
    }

    const commentOk = await this.quotaService.tryConsumeComment(userId, maxComments);
    if (!commentOk) {
      this.quotaService.throwPaywall('Daily comment limit reached. Upgrade to continue.', snapshot.plan);
    }

    const created = await this.photoRepository.createComment({
      photoId,
      userId,
      text: dto.text,
    });

    return created;
  }

  async toggleLikeComment(commentId: string, userId: string) {
    const comment = await this.photoRepository.getCommentById(commentId);
    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found.`);
    }

    const liked = await this.photoRepository.hasLikedComment(commentId, userId);
    if (liked) {
      await this.photoRepository.removeCommentLike(commentId, userId);
      return { liked: false, likes: Math.max(0, comment.likesCount - 1) };
    } else {
      await this.photoRepository.addCommentLike(commentId, userId);
      return { liked: true, likes: comment.likesCount + 1 };
    }
  }
}
