import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('02 Users & Profile')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile/me')
  @ApiOperation({ summary: 'Retrieve the current logged-in user profile details' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  async getProfile(@CurrentUser() user: any) {
    return this.userService.findById(user.sub);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Update profile details for the current user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  async updateProfile(@CurrentUser() user: any, @Body() updateData: any) {
    return this.userService.updateProfile(user.sub, updateData);
  }

  @Get('users/explore')
  @ApiOperation({
    summary: 'Search and browse casting artists and talent',
    description:
      'Returns { profiles, paywall, remaining, hasMore }. After the daily scroll cap the list is empty and paywall=true. The app must stop requesting more pages.',
  })
  @ApiQuery({ name: 'query', required: false, description: 'Filter creators by name' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter creators by category (e.g., Actor, Model, Dancer)' })
  @ApiResponse({ status: 200, description: 'Returns matching talent lists.' })
  async explore(
    @CurrentUser() user: any,
    @Query('query') query?: string,
    @Query('category') category?: string,
  ) {
    return this.userService.exploreCreators(user.sub, query, category);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get another user public profile details and follow status' })
  @ApiResponse({ status: 200, description: 'Returns target user stats and details.' })
  async getPublicProfile(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.userService.getPublicProfile(user.sub, targetId);
  }

  @Post('users/:id/follow')
  @ApiOperation({ summary: 'Follow or unfollow a specific user profile' })
  @ApiResponse({ status: 200, description: 'Toggled successfully. Returns updated follow state.' })
  async toggleFollow(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.userService.toggleFollow(user.sub, targetId);
  }
}
