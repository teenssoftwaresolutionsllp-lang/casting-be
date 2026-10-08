import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminRepository } from './admin.repository';
import { AdminAuthGuard } from './admin-auth.guard';

@Module({
  controllers: [AdminController],
  providers: [AdminService, AdminRepository, AdminAuthGuard],
  exports: [AdminService, AdminRepository],
})
export class AdminModule {}
