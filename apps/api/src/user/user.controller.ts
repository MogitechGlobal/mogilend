import { Controller, Get, Post, Body, Query, Param, UseGuards, Request as NestRequest, Patch, Delete } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('staff')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager')
  async getStaff(@NestRequest() req: any, @Query('lender_id') queryLenderId?: string) {
    const lenderId = req.user.role === 'Super Admin' ? queryLenderId : req.user.lender_id;
    return this.userService.findStaffByLender(lenderId);
  }

  @Post('invite')
  @Roles('Super Admin', 'Lender Admin') // Only Admins can provision new staff
  async inviteStaff(@NestRequest() req: any, @Body() data: any) {
    // Force the tenant ID to match the acting admin's tenant to prevent cross-tenant user creation
    const lenderId = req.user.role === 'Super Admin' ? data.lender_id : req.user.lender_id;
    return this.userService.inviteStaff(lenderId, data);
  }

  // Add this inside your UserController class
  @Patch('profile/password')
  async updatePassword(@NestRequest() req: any, @Body() data: any) {
    // req.user.id is automatically provided by the JwtAuthGuard from their login token
    return this.userService.updatePassword(req.user.id, data);
  }

  @Patch(':id/toggle-status')
  @Roles('Super Admin', 'Lender Admin') // Only admins can suspend staff
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