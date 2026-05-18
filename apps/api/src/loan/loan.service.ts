import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  async findAll(lenderId: string) {
    if (!lenderId) return [];
    
    return this.prisma.loan.findMany({
      where: { lender_id: lenderId },
      include: {
        borrower: true,     
        loan_product: true,
        transactions: {
          orderBy: { transaction_date: 'desc' } 
        }
      },
      orderBy: { created_at: 'desc' }
    });
  }

  async getPendingApprovals(user: any) {
    const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;
    return this.prisma.loan.findMany({
      where: { 
        status: 'PENDING',
        ...(lenderId && { lender_id: lenderId })
      },
      include: { borrower: true, loan_product: true },
      orderBy: { created_at: 'desc' }
    });
  }

  async getPendingAmendments(user: any) {
    const lenderId = user.role === 'Super Admin' ? undefined : user.lender_id;
    
    return this.prisma.loan.findMany({
      where: { 
        status: 'AMENDMENT_REQUIRED',
        ...(lenderId && { lender_id: lenderId })
      },
      include: { borrower: true, loan_product: true },
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

    const term = data.term ? parseInt(data.term) : product.default_term;

    // Calculate Interest
    let interestAmount = 0;
    if (product.interest_type === 'FLAT' || product.interest_type === 'Flat Rate') {
      interestAmount = principal * (product.interest_rate / 100) * term;
    } else {
      // Fallback
      interestAmount = principal * (product.interest_rate / 100) * term;
    }

    const totalOwed = principal + interestAmount;

    return this.prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          borrower_id: data.borrower_id,
          loan_product_id: product.id,
          lender_id: lenderId,
          principal_amount: principal,
          interest_rate: product.interest_rate,
          outstanding_balance: totalOwed,
          total_owed: totalOwed,
          status: 'PENDING',
          // CRITICAL FIX: Save the requested term to the database!
          term: term, 
        }
      });

      return loan;
    });
  }

  async approveAndDisburse(loanId: string, user: any) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    if (loan.status !== 'PENDING') throw new BadRequestException('Loan is not pending approval');

    return this.prisma.loan.update({
      where: { id: loanId },
      data: {
        status: 'DISBURSED',
        disbursed_at: new Date()
      }
    });
  }

  async rejectLoan(loanId: string, user: any) {
    const loan = await this.prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new NotFoundException('Loan not found');
    
    return this.prisma.loan.update({
      where: { id: loanId },
      data: { status: 'REJECTED' }
    });
  }

  async updateLoanStatus(user: any, loanId: string, status: string) {
     return this.prisma.loan.update({
      where: { id: loanId },
      data: { status: status }
    });
  }

  async submitAmendment(user: any, loanId: string, data: any) {
    const loan = await this.prisma.loan.findUnique({ 
      where: { id: loanId },
      include: { loan_product: true }
    });

    if (!loan) throw new NotFoundException('Loan not found.');
    if (loan.status !== 'AMENDMENT_REQUIRED') throw new BadRequestException('Loan is not currently pending amendment.');

    const newPrincipal = parseFloat(data.principal_amount);
    if (newPrincipal < loan.loan_product.min_amount || newPrincipal > loan.loan_product.max_amount) {
      throw new BadRequestException(`Amount must be between KES ${loan.loan_product.min_amount} and ${loan.loan_product.max_amount}`);
    }

    // FIX: Parse the new term as well
    const term = data.term ? parseInt(data.term) : (loan.term || loan.loan_product.default_term);

    // Recalculate interest
    let interestAmount = 0;
    if (loan.loan_product.interest_type === 'FLAT' || loan.loan_product.interest_type === 'Flat Rate') {
      interestAmount = newPrincipal * (loan.interest_rate / 100) * term;
    }

    const newTotalOwed = newPrincipal + interestAmount;

    return this.prisma.loan.update({
      where: { id: loanId },
      data: {
         principal_amount: newPrincipal,
         total_owed: newTotalOwed,
         outstanding_balance: newTotalOwed,
         term: term, // CRITICAL FIX: Save the term here too
         status: 'PENDING'
      }
    });
  }
}