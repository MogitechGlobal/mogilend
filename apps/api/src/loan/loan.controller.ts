import { Controller, Post, Get, Query, Body, UseGuards, Request as NestRequest, Patch, Param } from '@nestjs/common';
import { LoanService } from './loan.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/loans')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LoanController {
  constructor(private readonly loanService: LoanService) {}

  @Get()
  async getAllLoans(@NestRequest() req: any, @Query('lender_id') lender_id?: string) {
    const activeLender = req.user.role === 'Super Admin' ? lender_id : req.user.lender_id;
    return this.loanService.findAll(activeLender);
  }

  // --- NEW: Pending Approvals Queue ---
  @Get('pending')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager') 
  async getPendingApprovals(@NestRequest() req: any) {
    return this.loanService.getPendingApprovals(req.user);
  }

  @Post('originate')
  async originateLoan(@NestRequest() req: any, @Body() data: any) {
    return this.loanService.originate(req.user, data);
  }

  // --- EXISTING ACTIONS ---
  @Patch(':id/disburse')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager')
  async disburseLoan(@NestRequest() req: any, @Param('id') loanId: string) {
    return this.loanService.approveAndDisburse(loanId, req.user);
  }

  @Patch(':id/reject')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
  async rejectLoanOld(@NestRequest() req: any, @Param('id') loanId: string) {
    return this.loanService.rejectLoan(loanId, req.user);
  }

  // --- NEW: Status update via the Dashboard Drawer ---
  @Patch(':id/status')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager')
  async updateLoanStatus(
    @NestRequest() req: any, 
    @Param('id') loanId: string, 
    @Body('status') status: string
  ) {
    return this.loanService.updateLoanStatus(req.user, loanId, status);
  }

  // --- NEW: Pending Amendments ---
  @Get('amendments')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
  async getPendingAmendments(@NestRequest() req: any) {
    return this.loanService.getPendingAmendments(req.user);
  }

  @Patch(':id/amend')
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
  async submitAmendment(@NestRequest() req: any, @Param('id') loanId: string, @Body() data: any) {
    return this.loanService.submitAmendment(req.user, loanId, data);
  }
}