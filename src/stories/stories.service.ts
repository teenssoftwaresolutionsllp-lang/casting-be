import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MediaService } from '../media/media.service';
import { StoriesRepository } from './stories.repository';
import { NotificationService } from '../notifications/notification.service';

const STORY_LIFETIME_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class StoriesService {
  constructor(
    private readonly storiesRepository: StoriesRepository,
    private readonly mediaService: MediaService,
    private readonly notificationService: NotificationService,
  ) {}

  async create(creatorId: string, file: Express.Multer.File) {
    const mediaUrl = await this.mediaService.uploadFile(file, 'stories');
    return this.storiesRepository.create({
      creatorId,
      mediaUrl,
      mediaType: file.mimetype.startsWith('video/') ? 'video' : 'image',
      expiresAt: new Date(Date.now() + STORY_LIFETIME_MS),
    });
  }

  async getFeed(viewerId: string, requestedLimit = 20, requestedOffset = 0) {
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(Math.trunc(requestedLimit), 1), 50) : 20;
    const offset = Number.isFinite(requestedOffset) ? Math.max(Math.trunc(requestedOffset), 0) : 0;
    return this.storiesRepository.getFeed(viewerId, limit, offset);
  }

  async markViewed(storyId: string, viewerId: string) {
    const story = await this.storiesRepository.findById(storyId);
    if (!story || story.expiresAt <= new Date()) {
      throw new NotFoundException('Active story not found.');
    }
    await this.storiesRepository.markViewed(storyId, viewerId);
    return { viewed: true };
  }

  async delete(storyId: string, userId: string) {
    const story = await this.storiesRepository.findById(storyId);
    if (!story) {
      throw new NotFoundException('Story not found.');
    }
    if (story.creatorId !== userId) {
      throw new ForbiddenException('You can only delete your own stories.');
    }
    await this.storiesRepository.deleteById(storyId);
    return { deleted: true };
  }

  // ── Story Like ─────────────────────────────────────────────────────────────

  async toggleLikeStory(storyId: string, userId: string) {
    const story = await this.storiesRepository.findById(storyId);
    if (!story || story.expiresAt <= new Date()) {
      throw new NotFoundException('Active story not found.');
    }

    const alreadyLiked = await this.storiesRepository.hasLikedStory(storyId, userId);
    if (alreadyLiked) {
      await this.storiesRepository.removeStoryLike(storyId, userId);
      return { liked: false };
    } else {
      await this.storiesRepository.addStoryLike(storyId, userId);

      if (story.creatorId !== userId) {
        this.notificationService
          .createNotification(
            story.creatorId,
            'Story liked ❤️',
            'Someone liked your story.',
            {
              actorId: userId,
              type: 'STORY_LIKED',
              entityType: 'STORY',
              entityId: storyId,
            },
          )
          .catch(() => undefined);
      }

      return { liked: true };
    }
  }

  // ── Story Reply ────────────────────────────────────────────────────────────

  async replyToStory(storyId: string, userId: string, text: string) {
    const story = await this.storiesRepository.findById(storyId);
    if (!story || story.expiresAt <= new Date()) {
      throw new NotFoundException('Active story not found.');
    }

    const reply = await this.storiesRepository.createStoryReply(storyId, userId, text);

    if (story.creatorId !== userId) {
      this.notificationService
        .createNotification(
          story.creatorId,
          'Story reply 💬',
          'Someone replied to your story.',
          {
            actorId: userId,
            type: 'STORY_REPLIED',
            entityType: 'STORY',
            entityId: storyId,
          },
        )
        .catch(() => undefined);
    }

    return reply;
  }
}
