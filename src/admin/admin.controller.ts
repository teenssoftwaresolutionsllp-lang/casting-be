import {
  Controller,
  Post,
  Get,
  Param,
  Query,
  Body,
  Patch,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminAuthGuard } from './admin-auth.guard';
import { AdminLoginDto } from './dto/admin-login.dto';

@ApiTags('Admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ==========================================
  // AUTH (No guard - public login)
  // ==========================================

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login - separate credentials from regular users' })
  @ApiResponse({ status: 200, description: 'Admin authenticated. Returns JWT token with admin flag.' })
  @ApiResponse({ status: 401, description: 'Invalid admin credentials or deactivated account.' })
  async login(@Body() dto: AdminLoginDto) {
    return this.adminService.login(dto);
  }

  // ==========================================
  // DASHBOARD (Protected)
  // ==========================================

  @Get('dashboard')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get admin dashboard statistics overview' })
  @ApiResponse({ status: 200, description: 'Returns platform-wide statistics.' })
  async getDashboard() {
    return this.adminService.getDashboard();
  }

  // ==========================================
  // USER MANAGEMENT (Protected)
  // ==========================================

  @Get('users')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users with search, filter, and pagination' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 20)' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, email, mobile, TRK code, or username' })
  @ApiQuery({ name: 'role', required: false, description: 'Filter by role: artist, audience, or all' })
  async getAllUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('role') role?: string,
  ) {
    return this.adminService.getAllUsers(page, limit, search, role);
  }

  @Get('users/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get complete user profile details with stats summary' })
  @ApiResponse({ status: 200, description: 'Returns full user profile and content counts.' })
  async getUserDetail(@Param('id') id: string) {
    return this.adminService.getUserDetail(id);
  }

  @Patch('users/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update selected user profile fields' })
  @ApiResponse({ status: 200, description: 'Returns the complete updated user profile.' })
  @ApiResponse({ status: 400, description: 'Invalid values or unsupported fields.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  async updateUser(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.adminService.updateUser(id, body);
  }

  @Delete('users/:id')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a user and cascade related records' })
  @ApiResponse({ status: 200, description: 'User deleted.' })
  @ApiResponse({ status: 404, description: 'User not found.' })
  @ApiResponse({ status: 409, description: 'Deletion is blocked by a related record.' })
  async deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
  }

  @Get('users/:id/videos')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all videos uploaded by a specific user' })
  async getUserVideos(@Param('id') id: string) {
    return this.adminService.getUserVideos(id);
  }

  @Get('users/:id/auditions')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all auditions/casting calls created by a specific user' })
  async getUserAuditions(@Param('id') id: string) {
    return this.adminService.getUserAuditions(id);
  }

  @Get('users/:id/applications')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all applications submitted by a specific user' })
  async getUserApplications(@Param('id') id: string) {
    return this.adminService.getUserApplications(id);
  }

  @Get('users/:id/stories')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all stories posted by a specific user' })
  async getUserStories(@Param('id') id: string) {
    return this.adminService.getUserStories(id);
  }

  @Get('users/:id/followers')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get follower list for a specific user' })
  async getUserFollowers(@Param('id') id: string) {
    return this.adminService.getUserFollowers(id);
  }

  @Get('users/:id/following')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get following list for a specific user' })
  async getUserFollowing(@Param('id') id: string) {
    return this.adminService.getUserFollowing(id);
  }

  // ==========================================
  // ACTIVITY LOGS (Protected)
  // ==========================================

  @Get('users/:id/activity')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get activity/audit logs for a specific user (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getUserActivityLogs(
    @Param('id') id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getUserActivityLogs(id, page, limit);
  }

  @Get('activity-logs')
  @UseGuards(AdminAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all platform activity logs with filters (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'action', required: false, description: 'Filter by action type (e.g., LOGIN, REGISTER, VIDEO_UPLOAD)' })
  @ApiQuery({ name: 'userId', required: false, description: 'Filter by specific user ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Filter from date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'Filter to date (ISO format)' })
  async getAllActivityLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.adminService.getAllActivityLogs(page, limit, action, userId, startDate, endDate);
  }
}
