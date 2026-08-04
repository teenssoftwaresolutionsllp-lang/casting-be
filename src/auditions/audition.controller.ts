import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AuditionService } from './audition.service';
import { CreateAuditionDto } from './dto/create-audition.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@ApiTags('Auditions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('auditions')
export class AuditionController {
  constructor(private readonly auditionService: AuditionService) {}

  @Post()
  @ApiOperation({ summary: 'Post a new casting call / audition opportunity' })
  @ApiResponse({ status: 201, description: 'Audition posted successfully.' })
  async create(@CurrentUser() user: any, @Body() dto: CreateAuditionDto) {
    return this.auditionService.createAudition(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve active audition casting calls list' })
  @ApiQuery({ name: 'category', required: false, description: 'Filter auditions by category (Film, Ad, Dancer, TV)' })
  @ApiResponse({ status: 200, description: 'Returns list of auditions.' })
  async findAll(@CurrentUser() user: any, @Query('category') category?: string) {
    return this.auditionService.findAll(user.sub, category);
  }

  @Get('my-posted')
  @ApiOperation({ summary: 'Retrieve auditions created/posted by the current user' })
  @ApiResponse({ status: 200, description: 'Returns posted auditions list with applicants count.' })
  async findMyPosted(@CurrentUser() user: any) {
    return this.auditionService.findMyPosted(user.sub);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Retrieve detailed information for a single audition opportunity' })
  @ApiResponse({ status: 200, description: 'Audition details. Includes applicant lists if called by publisher.' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.auditionService.findOne(id, user.sub);
  }
}
