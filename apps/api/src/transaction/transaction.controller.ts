import { Controller, Get, Post, Delete, Body, Query, Param, UseGuards, Request as NestRequest } from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('v1/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Get()
  async getTransactions(
    @NestRequest() req: any,
    @Query('type') type?: string,
    @Query('lender_id') lenderId?: string
  ) {
    const targetLender = req.user.role === 'Super Admin' ? lenderId : req.user.lender_id;
    return this.transactionService.findAll(targetLender, type);
  }

  // FIX: Added 'Branch Manager' to the permitted roles for recording repayments
  @Post('repayment') 
  @Roles('Super Admin', 'Lender Admin', 'Branch Manager', 'Loan Officer')
  async makeRepayment(@NestRequest() req: any, @Body() data: any) {
    return this.transactionService.recordRepayment(req.user, data);
  }

  @Delete(':id')
  @Roles('Super Admin', 'Lender Admin') // Restrict deletions to administrators only
  async deleteTransaction(@NestRequest() req: any, @Param('id') id: string) {
    return this.transactionService.deleteTransaction(req.user, id);
  }
}