import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  // --- UPDATED: Include Transactions in the payload ---
  async findAll(lenderId: string) {
    if (!lenderId) return [];
    
    return this.prisma.loan.findMany({
      where: { lender_id: lenderId },
      include: {
        borrower: true,     
        loan_product: true,
        transactions: {
          orderBy: { transaction_date: 'desc' } // Order history from newest to oldest
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async originate(user: any, data: any) {
    const lenderId = user.lender_id || data.lender_id;
    if (!lenderId) {
      throw new ForbiddenException('Lender ID is required for application.');
    }

    const product = await this.prisma.loanProduct.findFirst({
      where: { id: data.loan_product_id, lender_id: lenderId, is_active: true }
    });

    if (!product) {
      throw new NotFoundException('Active Loan Product not found for this lender.');
    }

    const principal = parseFloat(data.principal_amount);
    if (principal < product.min_amount || principal > product.max_amount) {
      throw new BadRequestException(`Amount must be between KES ${product.min_amount} and ${product.max_amount}`);
    }

    const term = parseInt(data.term || product.default_term);
    let interestAmount = 0;

    if (product.interest_type === 'FLAT' || product.interest_type === 'Flat Rate') {
      interestAmount = principal * (product.interest_rate / 100) * term;
    } else {
      throw new BadRequestException(`The interest type ${product.interest_type} is not yet implemented.`);
    }

    const totalOwed = principal + interestAmount;

    return this.prisma.loan.create({
      data: {
        lender_id: lenderId,
        borrower_id: data.borrower_id,
        loan_product_id: product.id,
        principal_amount: principal,
        interest_rate: product.interest_rate,
        total_owed: totalOwed,
        outstanding_balance: totalOwed,
        status: 'PENDING',
      }
    });
  }

  async approveAndDisburse(loanId: string, user: any) {
    const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;

    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        ...(lenderId && { lender_id: lenderId })
      }
    });

    if (!loan) throw new NotFoundException('Loan not found or unauthorized.');
    if (loan.status !== 'PENDING') throw new BadRequestException(`Cannot disburse a loan with status: ${loan.status}`);

    return this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: 'DISBURSED',
        disbursed_at: new Date(),
      }
    });
  }

  async rejectLoan(loanId: string, user: any) {
    const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;
    
    const loan = await this.prisma.loan.findFirst({
      where: { id: loanId, ...(lenderId && { lender_id: lenderId }) }
    });

    if (!loan || loan.status !== 'PENDING') {
      throw new BadRequestException('Only PENDING loans can be rejected.');
    }

    return this.prisma.loan.update({
      where: { id: loanId },
      data: { status: 'REJECTED' }
    });
  }
}