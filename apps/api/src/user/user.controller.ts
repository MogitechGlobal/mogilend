import { Controller, Get, Post, Body, Query, Param, UseGuards, Request as NestRequest, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async getStaff(@NestRequest() req: any, @Query('lender_id') queryLenderId?: string) {
    // Explicitly cast to string | undefined to satisfy TypeScript strict null checks
    const lenderId = req.user.role === 'Super Admin' ? queryLenderId : req.user.lender_id;
    return this.userService.findStaffByLender((lenderId ?? undefined) as string | undefined);
  }

  @Post('invite')
  @Roles('Super Admin', 'Lender Admin') 
  async inviteStaff(@NestRequest() req: any, @Body() data: any) {
    // Explicitly cast to string
    const lenderId = req.user.role === 'Super Admin' ? data.lender_id : req.user.lender_id;
    return this.userService.inviteStaff(lenderId as string, data);
  }

  @Post(':id/resend-invite')
  @Roles('Super Admin', 'Lender Admin')
  async resendInvite(@NestRequest() req: any, @Param('id') targetUserId: string) {
    return this.userService.resendInvite(req.user, targetUserId);
  }

  @Patch('profile/password')
  async updatePassword(@NestRequest() req: any, @Body() data: any) {
    return this.userService.updatePassword(req.user.id, data);
  }

  @Patch(':id/toggle-status')
  @Roles('Super Admin', 'Lender Admin') 
  async toggleUserStatus(@NestRequest() req: any, @Param('id') targetUserId: string) {
    return this.userService.toggleStatus(req.user, targetUserId);
  }

  @Patch(':id')
  @Roles('Super Admin', 'Lender Admin')
  async updateStaff(@NestRequest() req: any, @Param('id') targetUserId: string, @Body() data: any) {
    return this.userService.updateStaff(req.user, targetUserId, data);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Lender Admin')
  async deleteStaff(@NestRequest() req: any, @Param('id') targetUserId: string) {
    return this.userService.deleteStaff(req.user, targetUserId);
  }
}