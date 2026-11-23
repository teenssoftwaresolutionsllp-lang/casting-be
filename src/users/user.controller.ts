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
import { OptionalJwtAuthGuard } from '../auth/optional-jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CINEMA_CRAFTS } from '../common/cinema-crafts';

@ApiTags('Users & Profile')
@Controller()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('profile/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Retrieve the current logged-in user profile details' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully.' })
  async getProfile(@CurrentUser() user: any) {
    return this.userService.findById(user.sub);
  }

  @Patch('profile/me')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update profile details for the current user' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully.' })
  async updateProfile(@CurrentUser() user: any, @Body() updateData: any) {
    return this.userService.updateProfile(user.sub, updateData);
  }

  @Get('profile/me/completion')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get the current profile completion percentage' })
  @ApiResponse({ status: 200, description: 'Profile completion calculated successfully.' })
  async getProfileCompletion(@CurrentUser() user: any) {
    return this.userService.getProfileCompletion(user.sub);
  }

  @Get('users/explore')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Search and browse casting artists and talent' })
  @ApiQuery({ name: 'query', required: false, description: 'Filter creators by name' })
  @ApiQuery({
    name: 'category',
    required: false,
    enum: CINEMA_CRAFTS,
    description: 'Filter creators by cinema craft category; omit or use All for every category',
  })
  @ApiResponse({ status: 200, description: 'Returns matching talent lists.' })
  async explore(
    @CurrentUser() user: { sub: string } | undefined,
    @Query('query') query?: string,
    @Query('category') category?: string,
  ) {
    return this.userService.exploreCreators(user?.sub, query, category);
  }

  @Get('users/:id')
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Get another user public profile details and follow status' })
  @ApiResponse({ status: 200, description: 'Returns target user stats and details.' })
  async getPublicProfile(
    @CurrentUser() user: { sub: string } | undefined,
    @Param('id') targetId: string,
  ) {
    return this.userService.getPublicProfile(user?.sub, targetId);
  }

  @Post('users/:id/follow')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Follow or unfollow a specific user profile' })
  @ApiResponse({ status: 200, description: 'Toggled successfully. Returns updated follow state.' })
  async toggleFollow(@CurrentUser() user: any, @Param('id') targetId: string) {
    return this.userService.toggleFollow(user.sub, targetId);
  }
}
