import { Injectable } from '@nestjs/common';
import { ActivityLogRepository } from './activity-log.repository';

@Injectable()
export class ActivityLogService {
  constructor(private readonly activityLogRepository: ActivityLogRepository) {}

  async log(
    userId: string,
    action: string,
    entity?: string,
    entityId?: string,
    details?: Record<string, any>,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.activityLogRepository.create({
      userId,
      action,
      entity,
      entityId,
      details,
      ipAddress,
      userAgent,
    });
  }

  async getUserLogs(userId: string, page: number = 1, limit: number = 50) {
    const [logs, total] = await Promise.all([
      this.activityLogRepository.findByUserId(userId, page, limit),
      this.activityLogRepository.countByUserId(userId),
    ]);
    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllLogs(
    page: number = 1,
    limit: number = 50,
    filters?: { action?: string; userId?: string; startDate?: string; endDate?: string },
  ) {
    const [logs, total] = await Promise.all([
      this.activityLogRepository.findAll(page, limit, filters),
      this.activityLogRepository.countAll(filters),
    ]);
    return {
      data: logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
