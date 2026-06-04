import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request as NestRequest } from '@nestjs/common';
import { LenderService } from './lender.service';
import { CreateLenderDto } from './dto/create-lender.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/lenders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LenderController {
  constructor(private readonly lenderService: LenderService) {}

  @Post()
  @Roles('Super Admin')
  async createLender(@NestRequest() req: any, @Body() createLenderDto: CreateLenderDto) {
    // Pass req.user to service for Audit Logging
    return this.lenderService.onboardLender(req.user, createLenderDto);
  }

  @Get()
  @Roles('Super Admin')
  async getLenders() {
    return this.lenderService.getAllLenders();
  }

  @Patch(':id')
  @Roles('Super Admin')
  async updateLender(@NestRequest() req: any, @Param('id') id: string, @Body() data: any) {
    return this.lenderService.updateLender(req.user, id, data);
  }

  @Patch(':id/toggle-status')
  @Roles('Super Admin')
  async toggleStatus(@NestRequest() req: any, @Param('id') id: string) {
    return this.lenderService.toggleStatus(req.user, id);
  }

  // --- NEW ENDPOINT: Resend Invite ---
  @Post(':id/resend-invite')
  @Roles('Super Admin')
  async resendInvite(@NestRequest() req: any, @Param('id') id: string) {
    return this.lenderService.resendInvite(req.user, id);
  }

  @Delete(':id')
  @Roles('Super Admin')
  async deleteLender(@NestRequest() req: any, @Param('id') id: string) {
    return this.lenderService.deleteLender(req.user, id);
  }
}