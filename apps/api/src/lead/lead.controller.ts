import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Request as NestRequest } from '@nestjs/common';
import { LeadService } from './lead.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/leads')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LeadController {
  constructor(private readonly leadService: LeadService) {}

  @Post()
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
  async createLead(@NestRequest() req: any, @Body() data: any) {
    return this.leadService.createLead(req.user, data);
  }

  @Get()
  async getLeads(@NestRequest() req: any, @Query('lender_id') lenderId?: string) {
    return this.leadService.getLeads(req.user, lenderId);
  }

  @Patch(':id')
  async updateLead(@NestRequest() req: any, @Param('id') id: string, @Body() data: any) {
    return this.leadService.updateLead(req.user, id, data);
  }

  @Post(':id/convert')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
  async convertLead(@NestRequest() req: any, @Param('id') id: string, @Body('national_id') nationalId: string) {
    return this.leadService.convertToBorrower(req.user, id, nationalId);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager')
  async deleteLead(@NestRequest() req: any, @Param('id') id: string) {
    return this.leadService.deleteLead(req.user, id);
  }
}