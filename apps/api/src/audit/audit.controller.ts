import { Controller, Get, Query, UseGuards, Request as NestRequest } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('ledger')
  @Roles('Super Admin', 'Lender Admin')
  async getAuditLedger(
    @NestRequest() req: any,
    @Query('lender_id') lenderId?: string,
    @Query('page') page?: string,
    @Query('search') search?: string
  ) {
    return this.auditService.getLedger(
      req.user, 
      lenderId, 
      page ? parseInt(page) : 1, 
      search || ''
    );
  }
}