import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LoanService {
  constructor(private prisma: PrismaService) {}

  // --- EXISTING LOGIC ---
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

  // --- NEW: APPROVALS PENDING LOGIC ---
  async getPendingApprovals(user: any) {
    // 1. Base query: Only get loans with PENDING status
    const whereClause: any = { status: 'PENDING' };
    
    // 2. Tenant isolation
    if (user.role !== 'Super Admin') {
        whereClause.lender_id = user.lender_id;
    }

    // 3. Branch isolation: Branch Managers only see their branch's applications
    if (user.role === 'Branch Manager') {
      whereClause.borrower = { branch_id: user.branch_id };
    }

    return this.prisma.loan.findMany({
      where: whereClause,
      include: {
        borrower: {
          select: { first_name: true, last_name: true, phone_number: true, national_id: true, risk_score: true }
        },
        loan_product: {
          select: { name: true, interest_type: true, default_term: true }
        }
      },
      orderBy: { created_at: 'asc' } // Oldest applications first
    });
  }

  async updateLoanStatus(user: any, loanId: string, newStatus: string) {
    // UPDATED to include AMENDMENT_REQUIRED
    if (!['APPROVED', 'REJECTED', 'AMENDMENT_REQUIRED'].includes(newStatus)) {
      throw new BadRequestException('Invalid status update.');
    }

    const loan = await this.prisma.loan.findUnique({ 
      where: { id: loanId },
      include: { borrower: true }
    });

    if (!loan) throw new NotFoundException('Loan application not found.');

    // Enforce Tenant & Branch Isolation
    if (user.role !== 'Super Admin' && loan.lender_id !== user.lender_id) {
      throw new ForbiddenException('Unauthorized to modify this loan.');
    }
    if (user.role === 'Branch Manager' && loan.borrower.branch_id !== user.branch_id) {
      throw new ForbiddenException('Unauthorized to modify loans outside your branch.');
    }

    return this.prisma.loan.update({
      where: { id: loanId },
      data: { status: newStatus }
    });
  }

  // --- NEW: AMENDMENTS LOGIC ---
  async getPendingAmendments(user: any) {
    const whereClause: any = { status: 'AMENDMENT_REQUIRED' };
    
    if (user.role !== 'Super Admin') {
        whereClause.lender_id = user.lender_id;
    }
    if (user.role === 'Branch Manager' || user.role === 'Loan Officer') {
      whereClause.borrower = { branch_id: user.branch_id };
    }

    return this.prisma.loan.findMany({
      where: whereClause,
      include: {
        borrower: { select: { first_name: true, last_name: true, phone_number: true, national_id: true } },
        loan_product: { select: { name: true, interest_type: true, default_term: true, min_amount: true, max_amount: true } }
      },
      orderBy: { updated_at: 'desc' } 
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

    // Recalculate interest
    let interestAmount = 0;
    if (loan.loan_product.interest_type === 'FLAT' || loan.loan_product.interest_type === 'Flat Rate') {
      const term = data.term || loan.loan_product.default_term;
      interestAmount = newPrincipal * (loan.interest_rate / 100) * term;
    } else {
      throw new BadRequestException(`Interest type ${loan.loan_product.interest_type} recalculation not implemented yet.`);
    }

    const newTotalOwed = newPrincipal + interestAmount;

    return this.prisma.loan.update({
      where: { id: loanId },
      data: {
        principal_amount: newPrincipal,
        total_owed: newTotalOwed,
        outstanding_balance: newTotalOwed,
        status: 'PENDING' // Send it back to the manager's approval queue!
      }
    });
  }
}