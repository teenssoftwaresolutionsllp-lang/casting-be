import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async findByEmail(email: string) {
    return this.userRepository.findByEmail(email);
  }

  async updateProfile(id: string, updateData: any) {
    // prevent updating email, password or id from public profile update endpoint
    delete updateData.password;
    delete updateData.email;
    delete updateData.id;
    return this.userRepository.update(id, updateData);
  }

  async getPublicProfile(currentUserId: string, targetUserId: string) {
    const user = await this.findById(targetUserId);
    const followers = await this.userRepository.getFollowersCount(targetUserId);
    const following = await this.userRepository.getFollowingCount(targetUserId);
    const videosCount = await this.userRepository.getVideosCount(targetUserId);
    const isFollowing = await this.userRepository.isFollowing(currentUserId, targetUserId);

    return {
      id: user.id,
      name: user.fullName,
      stageName: user.stageName,
      category: user.category,
      bio: user.bio,
      pic: user.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
      followers: this.formatCount(followers),
      followingCount: this.formatCount(following),
      videosCount,
      following: isFollowing,
      role: user.role,
      details: user,
    };
  }

  async exploreCreators(currentUserId: string, query?: string, category?: string) {
    const creators = await this.userRepository.exploreTalent(query, category);
    
    return Promise.all(
      creators.map(async (creator) => {
        const followers = await this.userRepository.getFollowersCount(creator.id);
        const following = await this.userRepository.isFollowing(currentUserId, creator.id);
        const videosCount = await this.userRepository.getVideosCount(creator.id);
        
        return {
          id: creator.id,
          name: creator.fullName,
          category: creator.category || 'Actor',
          bio: creator.bio || 'Talent Casting artist.',
          pic: creator.profilePhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
          followers: this.formatCount(followers),
          videosCount,
          handle: creator.stageName 
            ? `@${creator.stageName.toLowerCase().replace(/\s+/g, '')}` 
            : `@user${creator.id.substring(0, 5)}`,
          following,
        };
      }),
    );
  }

  async toggleFollow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new BadRequestException('You cannot follow yourself');
    }
    const alreadyFollowing = await this.userRepository.isFollowing(followerId, followingId);
    if (alreadyFollowing) {
      await this.userRepository.unfollowUser(followerId, followingId);
      return { following: false };
    } else {
      await this.userRepository.followUser(followerId, followingId);
      return { following: true };
    }
  }

  private formatCount(num: number): string {
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
