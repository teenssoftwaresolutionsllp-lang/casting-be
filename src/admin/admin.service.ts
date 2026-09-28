import { Injectable, UnauthorizedException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRepository } from './admin.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly jwtService: JwtService,
    private readonly activityLogService: ActivityLogService,
  ) {}

  // ==========================================
  // ADMIN AUTH
  // ==========================================

  async login(dto: AdminLoginDto) {
    const admin = await this.adminRepository.findAdminByEmail(dto.email);
    if (!admin) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    if (!admin.isActive) {
      throw new UnauthorizedException('Admin account is deactivated.');
    }

    const passwordMatch = await bcrypt.compare(dto.password, admin.password);
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid admin credentials.');
    }

    // Update last login
    await this.adminRepository.updateLastLogin(admin.id);

    // Generate admin JWT (with isAdmin flag)
    const token = await this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      adminRole: admin.role,
      isAdmin: true,
    });

    return {
      token,
      admin: {
        id: admin.id,
        email: admin.email,
        fullName: admin.fullName,
        role: admin.role,
      },
    };
  }

  // ==========================================
  // DASHBOARD
  // ==========================================

  async getDashboard() {
    return this.adminRepository.getDashboardStats();
  }

  // ==========================================
  // USER MANAGEMENT
  // ==========================================

  async getAllUsers(page: number = 1, limit: number = 20, search?: string, role?: string) {
    const [users, total] = await Promise.all([
      this.adminRepository.getAllUsers(page, limit, search, role),
      this.adminRepository.countUsers(search, role),
    ]);

    // Strip passwords from response
    const sanitizedUsers = users.map(({ password, ...rest }) => rest);

    return {
      data: sanitizedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.adminRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }

    const [videosCount, auditionsCount, applicationsCount, followersCount, followingCount] =
      await Promise.all([
        this.adminRepository.getVideosCount(userId),
        this.adminRepository.getAuditionsCount(userId),
        this.adminRepository.getApplicationsCount(userId),
        this.adminRepository.getFollowersCount(userId),
        this.adminRepository.getFollowingCount(userId),
      ]);

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
      stats: {
        videosCount,
        auditionsCount,
        applicationsCount,
        followersCount,
        followingCount,
      },
    };
  }

  async getUserVideos(userId: string) {
    return this.adminRepository.getUserVideos(userId);
  }

  async getUserAuditions(userId: string) {
    return this.adminRepository.getUserAuditions(userId);
  }

  async getUserApplications(userId: string) {
    return this.adminRepository.getUserApplications(userId);
  }

  async getUserStories(userId: string) {
    return this.adminRepository.getUserStories(userId);
  }

  async getUserFollowers(userId: string) {
    return this.adminRepository.getUserFollowers(userId);
  }

  async getUserFollowing(userId: string) {
    return this.adminRepository.getUserFollowing(userId);
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================

  async getUserActivityLogs(userId: string, page: number = 1, limit: number = 50) {
    return this.activityLogService.getUserLogs(userId, page, limit);
  }

  async getAllActivityLogs(
    page: number = 1,
    limit: number = 50,
    action?: string,
    userId?: string,
    startDate?: string,
    endDate?: string,
  ) {
    return this.activityLogService.getAllLogs(page, limit, {
      action,
      userId,
      startDate,
      endDate,
    });
  }
}
