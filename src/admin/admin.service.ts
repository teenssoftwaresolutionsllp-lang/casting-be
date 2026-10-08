import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AdminRepository } from './admin.repository';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import * as schema from '../db/schema';
import { isEmail, isUUID } from 'class-validator';
import { USER_ROLES } from '../users/user-roles';
import * as bcrypt from 'bcrypt';

const editableFields = new Set([
  'fullName',
  'username',
  'email',
  'role',
  'mobile',
  'trkCode',
  'city',
  'state',
  'country',
  'gender',
  'dateOfBirth',
  'occupation',
  'bio',
  'website',
  'instagramHandle',
  'facebookUrl',
  'youtubeUrl',
  'address',
  'postalCode',
  'languages',
]);
const userRoles: ReadonlySet<string> = new Set(USER_ROLES);

type EditableUserValues = {
  fullName?: string;
  username?: string | null;
  email?: string | null;
  role?: string;
  mobile?: string | null;
  trkCode?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  occupation?: string | null;
  bio?: string | null;
  website?: string | null;
  instagramHandle?: string | null;
  facebookUrl?: string | null;
  youtubeUrl?: string | null;
  address?: string | null;
  postalCode?: string | null;
  languages?: string[] | null;
};

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

  async getAllUsers(
    page: number = 1,
    limit: number = 20,
    search?: string,
    role?: string,
  ) {
    this.validatePagination(page, limit, 100);
    if (search !== undefined && typeof search !== 'string') {
      throw new BadRequestException('Search text must be a string.');
    }
    if (role !== undefined && typeof role !== 'string') {
      throw new BadRequestException('Role must be a string.');
    }
    const normalizedRole = role?.trim();
    if (
      normalizedRole &&
      normalizedRole !== 'all' &&
      !userRoles.has(normalizedRole)
    ) {
      throw new BadRequestException('Role must be artist, audience, or all.');
    }
    const normalizedSearch = search?.trim() || undefined;
    if (normalizedSearch && normalizedSearch.length > 200) {
      throw new BadRequestException(
        'Search text must be at most 200 characters.',
      );
    }
    const [users, total] = await Promise.all([
      this.adminRepository.getAllUsers(
        page,
        limit,
        normalizedSearch,
        normalizedRole,
      ),
      this.adminRepository.countUsers(normalizedSearch, normalizedRole),
    ]);

    return {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserDetail(userId: string) {
    const user = await this.requireUser(userId);
    const [
      videosCount,
      auditionsCount,
      applicationsCount,
      storiesCount,
      followersCount,
      followingCount,
    ] = await Promise.all([
      this.adminRepository.getVideosCount(userId),
      this.adminRepository.getAuditionsCount(userId),
      this.adminRepository.getApplicationsCount(userId),
      this.adminRepository.getStoriesCount(userId),
      this.adminRepository.getFollowersCount(userId),
      this.adminRepository.getFollowingCount(userId),
    ]);

    return {
      id: user.id,
      fullName: user.fullName,
      username: user.username,
      email: user.email,
      role: user.role,
      mobile: user.mobile,
      trkCode: user.trkCode,
      city: user.city,
      state: user.state,
      country: user.country,
      gender: user.gender,
      dateOfBirth: user.dob,
      occupation: user.occupation,
      bio: user.bio,
      website: user.website,
      instagramHandle: user.instagram,
      facebookUrl: user.facebookUrl,
      youtubeUrl: user.youtube,
      address: user.address,
      postalCode: user.postalCode,
      languages: user.languages,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        videosCount,
        auditionsCount,
        applicationsCount,
        storiesCount,
        followersCount,
        followingCount,
      },
    };
  }

  async updateUser(userId: string, body: Record<string, unknown>) {
    await this.requireUser(userId);
    const values = this.validateUserUpdate(body);
    const uniqueFields: Array<'username' | 'email' | 'mobile' | 'trkCode'> = [
      'username',
      'email',
      'mobile',
      'trkCode',
    ];

    for (const field of uniqueFields) {
      const value = values[field];
      if (
        typeof value === 'string' &&
        (await this.adminRepository.hasDuplicateUserValue(field, value, userId))
      ) {
        throw new BadRequestException(
          `A user with this ${field} already exists.`,
        );
      }
    }

    const updates: Partial<typeof schema.users.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (values.fullName !== undefined) updates.fullName = values.fullName;
    if (values.username !== undefined) updates.username = values.username;
    if (values.email !== undefined) updates.email = values.email;
    if (values.role !== undefined) updates.role = values.role;
    if (values.mobile !== undefined) updates.mobile = values.mobile;
    if (values.trkCode !== undefined) updates.trkCode = values.trkCode;
    if (values.city !== undefined) updates.city = values.city;
    if (values.state !== undefined) updates.state = values.state;
    if (values.country !== undefined) updates.country = values.country;
    if (values.gender !== undefined) updates.gender = values.gender;
    if (values.dateOfBirth !== undefined) updates.dob = values.dateOfBirth;
    if (values.occupation !== undefined) updates.occupation = values.occupation;
    if (values.bio !== undefined) updates.bio = values.bio;
    if (values.website !== undefined) updates.website = values.website;
    if (values.instagramHandle !== undefined)
      updates.instagram = values.instagramHandle;
    if (values.facebookUrl !== undefined)
      updates.facebookUrl = values.facebookUrl;
    if (values.youtubeUrl !== undefined) updates.youtube = values.youtubeUrl;
    if (values.address !== undefined) updates.address = values.address;
    if (values.postalCode !== undefined) updates.postalCode = values.postalCode;
    if (values.languages !== undefined) updates.languages = values.languages;

    try {
      const updatedUser = await this.adminRepository.updateUser(
        userId,
        updates,
      );
      if (!updatedUser) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new BadRequestException(
          'A user with one of the submitted unique values already exists.',
        );
      }
      throw error;
    }
    return this.getUserDetail(userId);
  }

  async deleteUser(userId: string) {
    await this.requireUser(userId);
    try {
      const deleted = await this.adminRepository.deleteUser(userId);
      if (!deleted) {
        throw new NotFoundException(`User with ID ${userId} not found.`);
      }
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'User cannot be deleted because related records prevent deletion.',
        );
      }
      throw error;
    }
    return { message: 'User deleted', userId };
  }

  async getUserVideos(userId: string) {
    await this.requireUser(userId);
    return this.adminRepository.getUserVideos(userId);
  }

  async getUserAuditions(userId: string) {
    await this.requireUser(userId);
    return this.adminRepository.getUserAuditions(userId);
  }

  async getUserApplications(userId: string) {
    await this.requireUser(userId);
    return this.adminRepository.getUserApplications(userId);
  }

  async getUserStories(userId: string) {
    await this.requireUser(userId);
    return this.adminRepository.getUserStories(userId);
  }

  async getUserFollowers(userId: string) {
    await this.requireUser(userId);
    return this.adminRepository.getUserFollowers(userId);
  }

  async getUserFollowing(userId: string) {
    await this.requireUser(userId);
    return this.adminRepository.getUserFollowing(userId);
  }

  // ==========================================
  // ACTIVITY LOGS
  // ==========================================

  async getUserActivityLogs(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    await this.requireUser(userId);
    this.validatePagination(page, limit, 100);
    const result = await this.activityLogService.getUserLogs(
      userId,
      page,
      limit,
    );
    return {
      logs: result.data.map(({ id, action, createdAt }) => ({
        id,
        action,
        createdAt,
      })),
      pagination: result.pagination,
    };
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

  private async requireUser(userId: string) {
    if (!isUUID(userId)) {
      throw new BadRequestException('User ID must be a valid UUID.');
    }
    const user = await this.adminRepository.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found.`);
    }
    return user;
  }

  private validatePagination(page: number, limit: number, maxLimit: number) {
    if (
      !Number.isSafeInteger(page) ||
      page < 1 ||
      !Number.isSafeInteger((page - 1) * limit)
    ) {
      throw new BadRequestException('Page must be a positive integer.');
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > maxLimit) {
      throw new BadRequestException(`Limit must be between 1 and ${maxLimit}.`);
    }
  }

  private validateUserUpdate(
    body: Record<string, unknown>,
  ): EditableUserValues {
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      throw new BadRequestException('Request body must be a JSON object.');
    }
    const fields = Object.keys(body);
    if (fields.length === 0) {
      throw new BadRequestException(
        'At least one editable profile field must be supplied.',
      );
    }
    for (const field of fields) {
      if (!editableFields.has(field)) {
        throw new BadRequestException(`Field "${field}" cannot be updated.`);
      }
    }

    const values: EditableUserValues = {};
    for (const [field, rawValue] of Object.entries(body)) {
      if (field === 'languages') {
        if (rawValue === null) {
          values.languages = null;
          continue;
        }
        const items =
          typeof rawValue === 'string'
            ? rawValue.split(',')
            : Array.isArray(rawValue) &&
                rawValue.every((item) => typeof item === 'string')
              ? rawValue
              : null;
        if (!items || items.length > 50) {
          throw new BadRequestException(
            'Languages must be a string or an array of up to 50 strings.',
          );
        }
        values.languages = items.map((item) => {
          const language = item.trim();
          if (
            !language ||
            language.length > 100 ||
            this.hasControlCharacters(language)
          ) {
            throw new BadRequestException(
              'Each language must be a non-empty string of at most 100 characters.',
            );
          }
          return language;
        });
        continue;
      }

      if (rawValue === null) {
        if (field === 'fullName' || field === 'role') {
          throw new BadRequestException(`${field} cannot be null.`);
        }
        this.assignNullableValue(values, field, null);
        continue;
      }
      if (typeof rawValue !== 'string') {
        throw new BadRequestException(`${field} must be a string.`);
      }

      const value = rawValue.trim();
      const maxLength = field === 'bio' ? 5000 : 500;
      if (value.length > maxLength || this.hasControlCharacters(value, true)) {
        throw new BadRequestException(
          `${field} contains invalid characters or exceeds ${maxLength} characters.`,
        );
      }

      if (field === 'fullName' && !value) {
        throw new BadRequestException('fullName cannot be empty.');
      }
      if (field === 'role' && !userRoles.has(value)) {
        throw new BadRequestException('Role must be artist or audience.');
      }
      if (
        field === 'username' &&
        value &&
        (value.length > 50 || !/^[A-Za-z0-9._-]+$/.test(value))
      ) {
        throw new BadRequestException(
          'Username may contain only letters, numbers, dots, underscores, and hyphens.',
        );
      }
      if (
        field === 'email' &&
        value &&
        (value.length > 254 || !isEmail(value))
      ) {
        throw new BadRequestException('Email must be a valid email address.');
      }
      if (
        field === 'mobile' &&
        value &&
        (!/^\+?[0-9().\-\s]{5,25}$/.test(value) ||
          (value.match(/\d/g) ?? []).length < 5)
      ) {
        throw new BadRequestException('Mobile must be a valid phone number.');
      }
      if (field === 'dateOfBirth' && value && !this.isValidDate(value)) {
        throw new BadRequestException(
          'dateOfBirth must be a valid date in YYYY-MM-DD format.',
        );
      }
      if (
        ['website', 'facebookUrl', 'youtubeUrl'].includes(field) &&
        value &&
        !this.isHttpUrl(value)
      ) {
        throw new BadRequestException(
          `${field} must be a valid HTTP or HTTPS URL.`,
        );
      }

      const nullableValue = value || null;
      this.assignNullableValue(values, field, nullableValue);
    }
    return values;
  }

  private assignNullableValue(
    values: EditableUserValues,
    field: string,
    value: string | null,
  ) {
    switch (field) {
      case 'fullName':
        if (value !== null) values.fullName = value;
        break;
      case 'username':
        values.username = value;
        break;
      case 'email':
        values.email = value;
        break;
      case 'role':
        if (value !== null) values.role = value;
        break;
      case 'mobile':
        values.mobile = value;
        break;
      case 'trkCode':
        values.trkCode = value;
        break;
      case 'city':
        values.city = value;
        break;
      case 'state':
        values.state = value;
        break;
      case 'country':
        values.country = value;
        break;
      case 'gender':
        values.gender = value;
        break;
      case 'dateOfBirth':
        values.dateOfBirth = value;
        break;
      case 'occupation':
        values.occupation = value;
        break;
      case 'bio':
        values.bio = value;
        break;
      case 'website':
        values.website = value;
        break;
      case 'instagramHandle':
        values.instagramHandle = value;
        break;
      case 'facebookUrl':
        values.facebookUrl = value;
        break;
      case 'youtubeUrl':
        values.youtubeUrl = value;
        break;
      case 'address':
        values.address = value;
        break;
      case 'postalCode':
        values.postalCode = value;
        break;
      default:
        throw new BadRequestException(`Field "${field}" cannot be updated.`);
    }
  }

  private isValidDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }

  private isHttpUrl(value: string): boolean {
    try {
      const url = new URL(value);
      return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
      return false;
    }
  }

  private hasControlCharacters(
    value: string,
    allowWhitespace = false,
  ): boolean {
    return Array.from(value).some((character) => {
      const code = character.charCodeAt(0);
      return (
        code === 127 ||
        (code < 32 &&
          !(allowWhitespace && (code === 9 || code === 10 || code === 13)))
      );
    });
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23505'
    );
  }

  private isForeignKeyViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === '23503'
    );
  }
}
