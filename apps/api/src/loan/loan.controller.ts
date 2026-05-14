import { Controller, Post, Get, Query, Body, UseGuards, Request as NestRequest, Patch, Param } from '@nestjs/common';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  // --- THIS WAS MISSING: Fetch all loans for the queue ---
  @Get()
  async getAllLoans(@NestRequest() req: any, @Query('lender_id') lender_id?: string) {
    const activeLender = req.user.role === 'Super Admin' ? lender_id : req.user.lender_id;
    return this.loanService.findAll(activeLender);
  }

  @Post('originate')
  @Roles('Super Admin', 'Lender Admin', 'Loan Officer')
  async originateLoan(@NestRequest() req: any, @Body() data: any) {
    return this.loanService.originate(req.user, data);
  }

  @Patch(':id/disburse')
  @Roles('Super Admin', 'Lender Admin')
  async disburseLoan(@NestRequest() req: any, @Param('id') loanId: string) {
    return this.loanService.approveAndDisburse(loanId, req.user);
  }

  // --- THIS WAS MISSING: Reject a loan ---
  @Patch(':id/reject')
  @Roles('Super Admin', 'Lender Admin', 'Loan Officer')
  async rejectLoan(@NestRequest() req: any, @Param('id') loanId: string) {
    return this.loanService.rejectLoan(loanId, req.user);
  }
}